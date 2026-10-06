import SwiftUI
import CoreLocation

@MainActor final class AppStore: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var language: AppLanguage { didSet {
        UserDefaults.standard.set(language.rawValue, forKey: "language")
        Design.configureNativeFonts(language)
    } }
    @Published var appearance: Appearance { didSet { UserDefaults.standard.set(appearance.rawValue, forKey: "appearance") } }
    @Published var route: ShuttleRoute = .south
    @Published var direction: TripDirection = .work
    @Published var stopID = 0
    @Published var stops: [Stop] = []
    @Published var patterns: [RouteDetails.Pattern] = []
    @Published var snapshot: LiveSnapshot?
    @Published var profile = Commute()
    @Published var user: AuthUser?
    @Published var message = ""
    @Published var busy = false
    @Published var location: CLLocationCoordinate2D?
    private let locationManager = CLLocationManager()
    let accounts = AccountService()
    private var translations: [String: String] = [:]
    private var detailsRoute: ShuttleRoute?
    override init() {
        language = AppLanguage(rawValue: UserDefaults.standard.string(forKey: "language") ?? "en") ?? .en
        appearance = Appearance(rawValue: UserDefaults.standard.string(forKey: "appearance") ?? "system") ?? .system
        super.init()
        Design.configureNativeFonts(language)
        if let url = Bundle.main.url(forResource: "my", withExtension: "json"), let data = try? Data(contentsOf: url) { translations = (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:] }
        profile = localProfile("guest")
        route = ShuttleRoute(rawValue: profile.lot) ?? .south
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }
    func t(_ text: String) -> String { language == .my ? translations[text] ?? text : text }
    var options: [Stop] { Stop.boarding(stops, route: route, direction: direction) }
    var selectedStop: Stop? { options.first { $0.id == stopID } }
    private func localProfile(_ id: String) -> Commute {
        guard let data = UserDefaults.standard.data(forKey: "commute:" + id), var commute = try? JSONDecoder().decode(Commute.self, from: data) else { return Commute() }
        commute.normalize(); return commute
    }
    func selectDefault() {
        let saved = direction == .work ? profile.parkingStopID : profile.terminalStopID
        if profile.lot == route.rawValue, options.contains(where: { $0.id == saved }) { stopID = saved; return }
        if direction == .parking {
            let key = profile.terminal.contains("TBIT") ? "B" : String(profile.terminal.last ?? "B")
            if let stop = options.first(where: { $0.terminalKey == key }) { stopID = stop.id; return }
        }
        stopID = options.first?.id ?? 0
    }
    func loadRoute() async {
        let requested = route
        if detailsRoute != requested { stops = []; patterns = []; snapshot = nil; stopID = 0 }
        do {
            let details = try await ShuttleService.details(requested)
            try Task.checkCancellation()
            guard requested == route else { return }
            stops = details.stops; patterns = details.patterns; detailsRoute = requested
            if !options.contains(where: { $0.id == stopID }) { selectDefault() }
            message = details.warning ?? ""
        } catch is CancellationError { } catch {
            guard !Task.isCancelled, requested == route else { return }
            message = "Live shuttle data is unavailable. Updates will retry automatically."
        }
    }
    func refresh() async {
        let requestedRoute = route, requestedStop = stopID
        do {
            let live = try await ShuttleService.live(requestedRoute, stopID: requestedStop)
            try Task.checkCancellation()
            guard requestedRoute == route, requestedStop == stopID else { return }
            snapshot = live
            message = live.warnings.joined(separator: " ")
        } catch is CancellationError { } catch {
            guard !Task.isCancelled, requestedRoute == route, requestedStop == stopID else { return }
            message = "Live shuttle data is unavailable. Updates will retry automatically."
        }
    }
    func restoreAccount() async {
        do { if let restored = try await accounts.restore() { accept(restored) } }
        catch { message = "Could not restore your account. You can continue as a guest." }
    }
    func accept(_ signedIn: AuthUser) {
        user = signedIn
        profile = signedIn.user_metadata?.commute ?? localProfile(signedIn.id)
        profile.normalize()
        route = ShuttleRoute(rawValue: profile.lot) ?? .south
        stopID = 0
        selectDefault()
    }
    func saveProfile() async throws {
        profile.normalize()
        if user != nil { user = try await accounts.save(profile) }
        UserDefaults.standard.set(try JSONEncoder().encode(profile), forKey: "commute:" + (user?.id ?? "guest"))
    }
    func saveBoarding() async {
        guard let selectedStop else { return }
        profile.lot = route.rawValue
        if direction == .work { profile.parkingStopID = selectedStop.id; profile.parkingStopName = selectedStop.name }
        else { profile.terminalStopID = selectedStop.id; profile.terminalStopName = selectedStop.name }
        do { try await saveProfile(); message = "Saved." } catch { message = error.localizedDescription }
    }
    func signOut() async {
        await accounts.signOut()
        user = nil; profile = localProfile("guest"); route = ShuttleRoute(rawValue: profile.lot) ?? .south
        stopID = 0; snapshot = nil; selectDefault()
    }
    func locate() {
        switch locationManager.authorizationStatus {
        case .notDetermined: locationManager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse: locationManager.requestLocation()
        default: message = "Location is unavailable. Choose a stop manually."
        }
    }
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways { manager.requestLocation() }
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let current = locations.last, current.horizontalAccuracy >= 0,
              abs(current.timestamp.timeIntervalSinceNow) < 60 else { return }
        location = current.coordinate
        if let nearest = options.min(by: {
            CLLocation(latitude: $0.lat, longitude: $0.lon).distance(from: current) < CLLocation(latitude: $1.lat, longitude: $1.lon).distance(from: current)
        }) { stopID = nearest.id }
    }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) { message = "Location is unavailable. Choose a stop manually." }
}
