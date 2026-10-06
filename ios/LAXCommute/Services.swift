import Foundation
import Security

enum ServiceError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case .message(let text) = self { return text }; return nil }
}

enum AppConfig {
    static let website = URL(string: "https://employeeshuttlelax.com")!
    static let supabase = URL(string: Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String ?? "https://yzdoarjleozzblvsjbhx.supabase.co")!
    // A publishable browser/mobile key, never a service-role credential.
    static let publicKey = Bundle.main.object(forInfoDictionaryKey: "SupabasePublishableKey") as? String ?? ""
}

enum ShuttleService {
    static func get<T: Decodable>(_ path: String) async throws -> T {
        guard let url = URL(string: path, relativeTo: AppConfig.website) else { throw ServiceError.message("Invalid request.") }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
            throw ServiceError.message("Live shuttle data is unavailable. Updates will retry automatically.")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    static func details(_ route: ShuttleRoute) async throws -> RouteDetails { try await get("/api/routes/\(route.id)") }
    static func live(_ route: ShuttleRoute, stopID: Int) async throws -> LiveSnapshot { try await get("/api/live/\(route.id)?stopId=\(stopID)") }
}

struct AuthUser: Codable {
    struct Metadata: Codable { var commute: Commute? }
    let id: String
    let email: String?
    let user_metadata: Metadata?
}

struct AuthSession: Codable {
    let access_token: String
    let refresh_token: String
    let expires_at: Double?
    let expires_in: Double?
    var user: AuthUser
    var expiry: Date { Date(timeIntervalSince1970: expires_at ?? 0) }
}

enum SecureSession {
    private static let service = "com.laxcommute.native.session"
    static func read() -> Data? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
            kSecAttrAccount as String: "current", kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess else { return nil }
        return result as? Data
    }
    static func write(_ data: Data?) throws {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: "current"]
        guard let data else { SecItemDelete(query as CFDictionary); return }
        let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            var attributes = query
            attributes[kSecValueData as String] = data
            attributes[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            guard SecItemAdd(attributes as CFDictionary, nil) == errSecSuccess else { throw ServiceError.message("Could not securely save your session.") }
        } else if status != errSecSuccess { throw ServiceError.message("Could not securely save your session.") }
    }
}

actor AccountService {
    private var session: AuthSession?
    init() { if let data = SecureSession.read() { session = try? JSONDecoder().decode(AuthSession.self, from: data) } }
    private func request(_ path: String, method: String = "POST", body: [String: Any]? = nil, token: String? = nil) async throws -> Data {
        guard !AppConfig.publicKey.isEmpty, let url = URL(string: "/auth/v1/" + path, relativeTo: AppConfig.supabase) else {
            throw ServiceError.message("Sign-in is not configured. You can continue as a guest.")
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.httpMethod = method
        request.setValue(AppConfig.publicKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw ServiceError.message("Sign-in is temporarily unavailable.") }
        guard (200..<300).contains(response.statusCode) else {
            let error = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            throw ServiceError.message(error?["msg"] as? String ?? error?["message"] as? String ?? error?["error_description"] as? String ?? "Account request failed. Please try again.")
        }
        return data
    }
    private func accept(_ data: Data) throws -> AuthUser {
        let received = try JSONDecoder().decode(AuthSession.self, from: data)
        // Supabase responses may omit expires_at; persist an absolute expiration.
        let current = AuthSession(access_token: received.access_token, refresh_token: received.refresh_token,
            expires_at: received.expires_at ?? Date().timeIntervalSince1970 + (received.expires_in ?? 3600),
            expires_in: received.expires_in, user: received.user)
        try SecureSession.write(JSONEncoder().encode(current))
        session = current
        return current.user
    }
    private func authorizedSession() async throws -> AuthSession {
        guard let current = session else { throw ServiceError.message("Sign in to sync your commute.") }
        if current.expiry.timeIntervalSinceNow > 60 { return current }
        let data = try await request("token?grant_type=refresh_token", body: ["refresh_token": current.refresh_token])
        _ = try accept(data)
        return session!
    }
    func restore() async throws -> AuthUser? {
        guard session != nil else { return nil }
        let current = try await authorizedSession()
        let data = try await request("user", method: "GET", token: current.access_token)
        let user = try JSONDecoder().decode(AuthUser.self, from: data)
        session?.user = user
        if let session { try SecureSession.write(JSONEncoder().encode(session)) }
        return user
    }
    func signIn(email: String, password: String) async throws -> AuthUser {
        let data = try await request("token?grant_type=password", body: ["email": email, "password": password])
        return try accept(data)
    }
    func signUp(email: String, password: String, commute: Commute) async throws -> AuthUser? {
        let profile = try JSONSerialization.jsonObject(with: JSONEncoder().encode(commute))
        let data = try await request("signup", body: ["email": email, "password": password, "data": ["commute": profile]])
        if let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], object["access_token"] is String { return try accept(data) }
        return nil
    }
    func verify(email: String, code: String, recovery: Bool) async throws -> AuthUser {
        let data = try await request("verify", body: ["email": email, "token": code, "type": recovery ? "recovery" : "signup"])
        return try accept(data)
    }
    func sendCode(email: String, recovery: Bool) async throws {
        _ = try await request(recovery ? "recover" : "resend", body: recovery ? ["email": email] : ["email": email, "type": "signup"])
    }
    func changePassword(_ password: String) async throws {
        let current = try await authorizedSession()
        _ = try await request("user", method: "PUT", body: ["password": password], token: current.access_token)
    }
    func save(_ commute: Commute) async throws -> AuthUser {
        let current = try await authorizedSession()
        let value = try JSONSerialization.jsonObject(with: JSONEncoder().encode(commute))
        let data = try await request("user", method: "PUT", body: ["data": ["commute": value]], token: current.access_token)
        let user = try JSONDecoder().decode(AuthUser.self, from: data)
        session?.user = user
        if let session { try SecureSession.write(JSONEncoder().encode(session)) }
        return user
    }
    func signOut() async {
        if let current = session { _ = try? await request("logout?scope=local", token: current.access_token) }
        session = nil
        try? SecureSession.write(nil)
    }
}
