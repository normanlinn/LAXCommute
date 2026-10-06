import SwiftUI

struct AccountView: View {
    enum Mode: String, CaseIterable { case signin, signup, confirm, recover, resetCode, newPassword }
    @EnvironmentObject private var store: AppStore
    @Environment(\.colorScheme) private var scheme
    @State private var mode: Mode = .signin
    @State private var email = ""
    @State private var password = ""
    @State private var code = ""
    @State private var status = ""
    @State private var busy = false
    @State private var resendAfter = Date.distantPast
    @FocusState private var focused: Bool
    private var needsPassword: Bool { [.signin, .signup, .newPassword].contains(mode) }
    private var needsCode: Bool { mode == .confirm || mode == .resetCode }
    var body: some View {
        ScrollView {
            Panel {
                Label(store.t("Account"), systemImage: "lock")
                if let user = store.user, mode != .newPassword {
                    Text(store.t("Welcome back.")).font(Design.font(store.language, size: 28, bold: true, relativeTo: .title2))
                    Text(user.email ?? "").textSelection(.enabled)
                    Text(store.t("Your commute syncs with the website when you save."))
                    PrimaryButton(label: store.t("Sync saved commute")) {
                        run { if let user = try await store.accounts.restore() { store.accept(user) }; status = "Saved." }
                    }.disabled(busy)
                    Button(store.t("Sign out")) { run { await store.signOut() } }.buttonStyle(.bordered)
                } else {
                    Text(store.t("Welcome back.")).font(Design.font(store.language, size: 28, bold: true, relativeTo: .title2))
                    Text(store.t("You can always browse departures as a guest.")).foregroundStyle(Design.muted(scheme))
                    if mode == .signin || mode == .signup {
                        Picker(store.t("Account"), selection: $mode) {
                            Text(store.t("Sign in")).tag(Mode.signin)
                            Text(store.t("Create account")).tag(Mode.signup)
                        }.pickerStyle(.segmented)
                    }
                    if mode != .newPassword {
                        TextField(store.t("Email address"), text: $email)
                            .keyboardType(.emailAddress).textContentType(.username).textInputAutocapitalization(.never).autocorrectionDisabled()
                            .textFieldStyle(.roundedBorder).focused($focused)
                    }
                    if needsPassword {
                        SecureField(store.t(mode == .newPassword ? "Choose a new password." : "Password"), text: $password)
                            .textContentType(mode == .signin ? .password : .newPassword).textFieldStyle(.roundedBorder)
                    }
                    if needsCode {
                        TextField(store.t("Email code"), text: $code).keyboardType(.numberPad).textContentType(.oneTimeCode).textFieldStyle(.roundedBorder)
                        Text(store.t("Enter the code from your email. If no code appears, the email template needs to be updated.")).font(Design.font(store.language, size: 13, relativeTo: .footnote)).foregroundStyle(Design.muted(scheme))
                    }
                    PrimaryButton(label: busy ? store.t("Please wait…") : store.t(buttonTitle)) { submit() }.disabled(busy)
                    if mode == .signin {
                        Button(store.t("Forgot password?")) { mode = .recover; password = ""; status = "" }
                        Button(store.t("Confirm email or resend confirmation")) { mode = .confirm; password = ""; status = "" }
                    }
                    if needsCode {
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            let remaining = max(0, Int(ceil(resendAfter.timeIntervalSince(context.date))))
                            Button(remaining > 0 ? "\(store.t("Resend")) (\(remaining)s)" : store.t("Resend")) {
                                run {
                                    guard !trimmedEmail.isEmpty else { throw ServiceError.message("Enter your email address first.") }
                                    try await store.accounts.sendCode(email: trimmedEmail, recovery: mode == .resetCode)
                                    resendAfter = Date().addingTimeInterval(60)
                                    status = "Check your email."
                                }
                            }.disabled(busy || remaining > 0)
                        }
                    }
                    if mode != .signin && mode != .signup && mode != .newPassword {
                        Button(store.t("Back to sign in")) { mode = .signin; password = ""; code = ""; status = "" }
                    }
                }
                if !status.isEmpty { Text(store.t(status)).foregroundStyle(Design.muted(scheme)).accessibilityAddTraits(.updatesFrequently) }
            }.padding(16)
        }.background(Design.background(scheme)).foregroundStyle(Design.ink(scheme))
    }
    private var trimmedEmail: String { email.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var buttonTitle: String {
        switch mode {
        case .signin: "Sign in"
        case .signup: "Create account"
        case .confirm, .resetCode: "Verify email code"
        case .recover: "Send reset email"
        case .newPassword: "Update password"
        }
    }
    private func run(_ operation: @escaping @MainActor () async throws -> Void) {
        guard !busy else { return }
        busy = true; status = ""; focused = false
        Task {
            do { try await operation() } catch { status = error.localizedDescription }
            busy = false
        }
    }
    private func submit() {
        run {
            guard mode == .newPassword || !trimmedEmail.isEmpty else { throw ServiceError.message("Enter your email address first.") }
            if needsPassword && mode != .signin && password.count < 8 { throw ServiceError.message("Use at least 8 characters.") }
            switch mode {
            case .signin:
                store.accept(try await store.accounts.signIn(email: trimmedEmail, password: password)); password = ""
            case .signup:
                let user = try await store.accounts.signUp(email: trimmedEmail, password: password, commute: store.profile)
                password = ""
                if let user { store.accept(user) } else { mode = .confirm; status = "Check your email."; resendAfter = Date().addingTimeInterval(60) }
            case .confirm:
                store.accept(try await store.accounts.verify(email: trimmedEmail, code: code.trimmingCharacters(in: .whitespaces), recovery: false)); code = ""
            case .recover:
                try await store.accounts.sendCode(email: trimmedEmail, recovery: true)
                mode = .resetCode; status = "If an account exists, a reset email has been sent."; resendAfter = Date().addingTimeInterval(60)
            case .resetCode:
                let user = try await store.accounts.verify(email: trimmedEmail, code: code.trimmingCharacters(in: .whitespaces), recovery: true)
                mode = .newPassword; store.accept(user); code = ""
            case .newPassword:
                try await store.accounts.changePassword(password); password = ""; mode = .signin; status = "Your password has been updated."
            }
        }
    }
}
