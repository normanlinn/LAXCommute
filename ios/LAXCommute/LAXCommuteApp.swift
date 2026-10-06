import SwiftUI

@main struct LAXCommuteApp: App {
    @StateObject private var store = AppStore()
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(store)
                .preferredColorScheme(store.appearance.scheme)
                .environment(\.locale, Locale(identifier: store.language.rawValue))
                .font(Design.font(store.language))
                .tint(Design.accent)
                .task { await store.restoreAccount() }
        }
    }
}

enum AppTab: Hashable { case explore, home, saved, account }

struct RootView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.colorScheme) private var scheme
    @State private var tab: AppTab = .explore
    @State private var settings = false
    var body: some View {
        NavigationStack {
            TabView(selection: $tab) {
                TripView(active: tab == .explore)
                    .tabItem { Label(store.t("Explore"), systemImage: "map") }.tag(AppTab.explore)
                TripView(active: tab == .home)
                    .tabItem { Label(store.t("Go home"), systemImage: "house") }.tag(AppTab.home)
                CommuteView().tabItem { Label(store.t("My commute"), systemImage: "bookmark") }.tag(AppTab.saved)
                AccountView().tabItem { Label(store.t("Account"), systemImage: "person.crop.circle") }.tag(AppTab.account)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 10) {
                        Image("AppBrand").resizable().frame(width: 38, height: 38).clipShape(RoundedRectangle(cornerRadius: 11))
                        Text("LAXCommute").font(.system(.title3, design: .rounded).bold()).foregroundStyle(Design.ink(scheme))
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { settings = true } label: { Image(systemName: "line.3.horizontal") }
                        .accessibilityLabel(store.t("Open menu"))
                }
            }
            .toolbarBackground(Design.card(scheme), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .sheet(isPresented: $settings) { SettingsView() }
            .onChange(of: tab) { _, next in
                if next == .home { store.direction = .parking; store.selectDefault() }
            }
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            Form {
                Section(store.t("Language")) {
                    Picker(store.t("Language"), selection: $store.language) {
                        Text("English").tag(AppLanguage.en)
                        Text("မြန်မာ").font(Design.font(.my)).tag(AppLanguage.my)
                    }.pickerStyle(.segmented)
                }
                Section(store.t("Appearance")) {
                    Picker(store.t("Appearance"), selection: $store.appearance) {
                        Text(store.t("System")).tag(Appearance.system)
                        Text(store.t("Light")).tag(Appearance.light)
                        Text(store.t("Dark")).tag(Appearance.dark)
                    }.pickerStyle(.segmented)
                }
                Section {
                    Link(store.t("LAX tracker"), destination: URL(string: "https://shuttles.flylax.com/employeeparking")!)
                    Link(store.t("Open website"), destination: AppConfig.website)
                    Text(store.t("Independent employee project. Not an official LAWA app.")).font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle(store.t("Menu"))
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(store.t("Done")) { dismiss() } } }
        }
        .preferredColorScheme(store.appearance.scheme)
        .font(Design.font(store.language))
    }
}
