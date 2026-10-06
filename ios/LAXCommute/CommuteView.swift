import SwiftUI

struct CommuteView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.colorScheme) private var scheme
    @State private var status = ""
    @State private var saving = false
    var body: some View {
        Form {
            Section(store.t("My commute")) {
                Picker(store.t("Parking lot"), selection: Binding(get: { store.profile.lot }, set: { lot in
                    store.profile.lot = lot
                    store.profile.parkingStopID = 0; store.profile.parkingStopName = ""
                    store.profile.terminalStopID = 0; store.profile.terminalStopName = ""
                })) {
                    ForEach(ShuttleRoute.allCases) { route in Text(store.t(route.rawValue)).tag(route.rawValue) }
                }
                Picker(store.t("Terminal"), selection: Binding(get: { store.profile.terminal }, set: { terminal in
                    store.profile.terminal = terminal
                    store.profile.terminalStopID = 0; store.profile.terminalStopName = ""
                })) {
                    ForEach(Commute.terminals, id: \.self) { Text($0).tag($0) }
                }
                Stepper("\(store.t("Walking time")): \(store.profile.walkingMinutes) \(store.t("min"))", value: $store.profile.walkingMinutes, in: 1...45)
                Stepper("\(store.t("Departure buffer")): \(store.profile.bufferMinutes) \(store.t("min"))", value: $store.profile.bufferMinutes, in: 0...10)
            }
            Section(store.t("Saved boarding stops")) {
                Text(store.profile.parkingStopName.isEmpty ? store.t("Choose a stop in Explore and tap Usual stop.") : store.profile.parkingStopName)
                Text(store.profile.terminalStopName.isEmpty ? store.t("Choose a terminal stop in Go home and tap Usual stop.") : store.profile.terminalStopName)
                Button(store.t("Clear saved boarding stops")) {
                    store.profile.parkingStopID = 0; store.profile.parkingStopName = ""
                    store.profile.terminalStopID = 0; store.profile.terminalStopName = ""
                }
            }
            Section {
                PrimaryButton(label: saving ? store.t("Saving…") : store.t("Save commute")) {
                    saving = true
                    Task {
                        do {
                            try await store.saveProfile()
                            store.route = ShuttleRoute(rawValue: store.profile.lot) ?? .south
                            store.stopID = 0; store.selectDefault()
                            status = "Saved."
                        } catch { status = error.localizedDescription }
                        saving = false
                    }
                }.disabled(saving)
                if !status.isEmpty { Text(store.t(status)).foregroundStyle(Design.muted(scheme)) }
                Text(store.t(store.user == nil ? "Saved on this device. Sign in to sync your commute." : "Your commute syncs with the website when you save.")).font(Design.font(store.language, size: 13, relativeTo: .footnote))
            }
        }
        .scrollContentBackground(.hidden).background(Design.background(scheme))
    }
}
