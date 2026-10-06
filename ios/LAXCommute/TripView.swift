import SwiftUI
import MapKit

struct TripView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.colorScheme) private var scheme
    @Environment(\.scenePhase) private var phase
    let active: Bool
    @State private var camera: MapCameraPosition = .region(MKCoordinateRegion(center: .init(latitude: 33.944, longitude: -118.405), span: .init(latitudeDelta: 0.045, longitudeDelta: 0.045)))
    @State private var showAllStops = false
    private var requestKey: String { "\(active):\(phase == .active):\(store.route.id):\(store.stopID):\(store.direction.rawValue)" }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                TimelineView(.periodic(from: .now, by: 5)) { context in
                    Map(position: $camera) {
                        ForEach(store.patterns) { pattern in
                            MapPolyline(coordinates: RouteShape.decode(pattern.shape)).stroke(Design.route(store.route, scheme), lineWidth: 5)
                        }
                        ForEach(showAllStops ? store.options : store.selectedStop.map { [$0] } ?? []) { stop in
                            Annotation(stop.name, coordinate: stop.coordinate) {
                                Button { store.stopID = stop.id } label: {
                                    Image(systemName: stop.id == store.stopID ? "mappin.circle.fill" : "mappin.circle")
                                        .font(.title).foregroundStyle(Design.route(store.route, scheme)).background(.background, in: Circle())
                                }.accessibilityLabel(stop.name)
                            }
                        }
                        if let live = store.snapshot, live.routeID == store.route.id, FeedDate.fresh(live.vehicleFetchedAt, at: context.date, seconds: 180) {
                            ForEach(live.vehicles.filter { $0.fresh(at: context.date) }) { bus in
                                Annotation(bus.name ?? store.t("Shuttle"), coordinate: bus.coordinate) {
                                    Image(systemName: "bus.fill").foregroundStyle(.white).padding(9)
                                        .background(Design.route(store.route, .light), in: RoundedRectangle(cornerRadius: 12))
                                        .accessibilityLabel(store.t("Shuttle") + " " + (bus.name ?? String(bus.id)))
                                }
                            }
                        }
                        if let coordinate = store.location { Marker(store.t("Your location"), systemImage: "location.fill", coordinate: coordinate).tint(Design.accent) }
                    }
                    .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
                    .mapControls { MapCompass(); MapScaleView() }
                    .frame(height: 310).clipShape(RoundedRectangle(cornerRadius: 24))
                }
                HStack {
                    Button(store.t("Whole route")) { camera = .automatic }
                    Spacer()
                    Button(store.t("Near me")) { store.locate() }
                }.buttonStyle(.bordered)
                Toggle(store.t("Show other stops"), isOn: $showAllStops)
                Panel {
                    Text(store.t("Where are we headed?")).font(Design.font(store.language, size: 27, bold: true, relativeTo: .title2))
                    Text(store.t("Pick your lot and boarding stop. We’ll check the next departures.")).foregroundStyle(Design.muted(scheme))
                    Picker(store.t("Direction"), selection: $store.direction) {
                        Text(store.t("To work")).tag(TripDirection.work)
                        Text(store.t("To parking")).tag(TripDirection.parking)
                    }.pickerStyle(.segmented)
                    Text(store.t("Which shuttle do you want?")).fontWeight(.semibold)
                    HStack(spacing: 10) {
                        ForEach(ShuttleRoute.allCases) { route in
                            Button { store.route = route; store.stopID = 0 } label: {
                                Text(store.t(route.rawValue)).fontWeight(.bold).frame(maxWidth: .infinity).padding(.vertical, 13)
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(store.route == route ? Design.navy : Design.route(route, scheme))
                            .background(store.route == route ? Design.accent : Design.card(scheme), in: RoundedRectangle(cornerRadius: 14))
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Design.border(scheme), lineWidth: 1))
                            .accessibilityAddTraits(store.route == route ? .isSelected : [])
                        }
                    }
                    Text(store.t(store.route.coverage)).font(Design.font(store.language, size: 13, relativeTo: .footnote)).foregroundStyle(Design.muted(scheme))
                    if store.options.isEmpty {
                        Text(store.t("Boarding stops are loading or unavailable. Try Refresh.")).foregroundStyle(Design.muted(scheme))
                    } else {
                        Picker(store.t("Where are you boarding?"), selection: $store.stopID) {
                            ForEach(store.options) { stop in Text(stop.name).tag(stop.id) }
                        }.pickerStyle(.menu)
                        HStack {
                            Button { Task { await store.saveBoarding() } } label: { Label(store.t("Usual stop"), systemImage: "bookmark") }
                            Spacer()
                            Button { store.locate() } label: { Label(store.t("Use my location"), systemImage: "location") }
                        }.font(Design.font(store.language, size: 14, relativeTo: .footnote))
                        if let stop = store.selectedStop {
                            Text(store.t("From") + ": " + stop.name).fontWeight(.semibold)
                            Text(store.t("To") + ": " + (store.direction == .work ? store.profile.terminal : store.route.rawValue + " parking"))
                            Button(store.t("Directions to this stop")) {
                                let item = MKMapItem(placemark: MKPlacemark(coordinate: stop.coordinate))
                                item.name = stop.name
                                item.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking])
                            }.buttonStyle(.bordered)
                        }
                    }
                }
                ArrivalsView()
                if !store.message.isEmpty { Text(store.t(store.message)).foregroundStyle(Design.muted(scheme)).accessibilityAddTraits(.updatesFrequently) }
                Button { Task { await store.loadRoute(); await store.refresh() } } label: { Label(store.t("Refresh"), systemImage: "arrow.clockwise") }.buttonStyle(.bordered)
                Text(store.t("Actual feed data · no simulated buses")).font(Design.font(store.language, size: 13, relativeTo: .footnote)).foregroundStyle(Design.muted(scheme))
            }.padding(16)
        }
        .background(Design.background(scheme)).foregroundStyle(Design.ink(scheme))
        .onChange(of: store.direction) { _, _ in store.selectDefault(); store.snapshot = nil }
        .onChange(of: store.stopID) { _, _ in
            if let stop = store.selectedStop { camera = .region(.init(center: stop.coordinate, span: .init(latitudeDelta: 0.015, longitudeDelta: 0.015))) }
        }
        .task(id: requestKey) {
            guard active, phase == .active else { return }
            await store.loadRoute()
            while !Task.isCancelled {
                await store.refresh()
                do { try await Task.sleep(for: .seconds(60)) } catch { return }
                if store.stops.isEmpty { await store.loadRoute() }
            }
        }
    }
}

struct ArrivalsView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        TimelineView(.periodic(from: .now, by: 5)) { context in
            let live = store.snapshot
            let matching = live?.routeID == store.route.id && live?.stopID == store.stopID
            let predictions = matching ? live?.predictions(at: context.date) ?? [] : []
            Panel {
                Text(store.t("Next departures")).font(Design.font(store.language, size: 22, bold: true, relativeTo: .title3))
                if predictions.isEmpty { Text(store.t("No fresh arrivals yet. Check again shortly.")).foregroundStyle(Design.muted(scheme)) }
                ForEach(Array(predictions.prefix(5))) { prediction in
                    HStack {
                        Label(prediction.vehicle?.name ?? store.t("Shuttle"), systemImage: "bus")
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text("\(max(1, Int(ceil(prediction.due.timeIntervalSince(context.date) / 60)))) " + store.t("min")).fontWeight(.bold)
                            Text(store.t(prediction.scheduled ? "Scheduled" : "Live")).font(Design.font(store.language, size: 13, relativeTo: .footnote)).foregroundStyle(Design.muted(scheme))
                        }
                    }
                    Divider()
                }
                if let catchable = predictions.first(where: { !$0.scheduled && $0.vehicle?.fresh(at: context.date) == true && $0.due.timeIntervalSince(context.date) >= Double(store.profile.walkingMinutes * 60) }) {
                    let leave = catchable.due.addingTimeInterval(-Double((store.profile.walkingMinutes + store.profile.bufferMinutes) * 60))
                    Text(store.t("Leave by") + " " + leave.formatted(date: .omitted, time: .shortened)).fontWeight(.semibold)
                    Text("\(store.profile.walkingMinutes) " + store.t("min walk") + " · \(store.profile.bufferMinutes) " + store.t("min buffer")).font(Design.font(store.language, size: 13, relativeTo: .footnote)).foregroundStyle(Design.muted(scheme))
                }
            }
        }
    }
}
