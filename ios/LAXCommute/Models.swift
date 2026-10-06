import Foundation
import CoreLocation

enum ShuttleRoute: String, CaseIterable, Codable, Identifiable {
    case south = "South", east = "East", west = "West"
    var id: Int { switch self { case .south: 6885; case .east: 6884; case .west: 6883 } }
    var coverage: String { switch self { case .south: "All terminals"; case .east: "Terminals 1–3 + B"; case .west: "Terminals 4–7" } }
}

enum TripDirection: String, CaseIterable { case work, parking }

struct Stop: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let lat: Double
    let lon: Double
    var coordinate: CLLocationCoordinate2D { .init(latitude: lat, longitude: lon) }
    var terminalKey: String? {
        if name.range(of: #"\b(TBIT|Terminal\s*B)\b"#, options: [.regularExpression, .caseInsensitive]) != nil { return "B" }
        guard let match = name.range(of: #"(?:Terminal\s*|^T)([1-8])\b"#, options: [.regularExpression, .caseInsensitive]) else { return nil }
        return String(name[match].last!)
    }
    static func boarding(_ stops: [Stop], route: ShuttleRoute, direction: TripDirection) -> [Stop] {
        if direction == .parking { return stops.filter { $0.terminalKey != nil } }
        return stops.filter {
            $0.terminalKey == nil &&
            ($0.name.localizedCaseInsensitiveContains(route.rawValue) ||
             (route != .south && $0.name.range(of: #"\bsouth\s+lot\b"#, options: [.regularExpression, .caseInsensitive]) != nil)) &&
            $0.name.range(of: #"drop[ -]?off|layover"#, options: [.regularExpression, .caseInsensitive]) == nil
        }.sorted {
            let a = $0.name.localizedCaseInsensitiveContains(route.rawValue)
            let b = $1.name.localizedCaseInsensitiveContains(route.rawValue)
            return a != b ? a : $0.id < $1.id
        }
    }
}

struct Vehicle: Codable, Identifiable {
    let id: Int
    let name: String?
    let lat: Double
    let lon: Double
    let lastUpdated: String
    var coordinate: CLLocationCoordinate2D { .init(latitude: lat, longitude: lon) }
    func fresh(at now: Date) -> Bool {
        guard lat.isFinite, lon.isFinite, abs(lat) <= 90, abs(lon) <= 180,
              let stamp = FeedDate.parse(lastUpdated) else { return false }
        return (-30..<180).contains(now.timeIntervalSince(stamp))
    }
}

enum FeedDate {
    static func parse(_ value: String?) -> Date? {
        guard let value else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value)
    }
    static func fresh(_ stamp: String?, at now: Date, seconds: Double = 90) -> Bool {
        guard let date = parse(stamp) else { return false }
        return (-30..<seconds).contains(now.timeIntervalSince(date))
    }
}

struct Arrival: Decodable {
    struct Pattern: Decodable { let directionType: String?; let direction: String? }
    struct Route: Decodable { let id: Int }
    let secondsToArrival: Double
    let pattern: Pattern?
    let route: Route?
    let schedulePrediction: Bool?
    let vehicle: Vehicle?
}

struct Prediction: Identifiable {
    let id: String
    let due: Date
    let scheduled: Bool
    let vehicle: Vehicle?
}

struct RouteDetails: Decodable {
    struct Pattern: Decodable, Identifiable { let id: Int; let shape: String }
    let stops: [Stop]
    let patterns: [Pattern]
    let warning: String?
}

struct LiveSnapshot: Decodable {
    let routeID: Int
    let stopID: Int
    let vehicles: [Vehicle]
    let vehicleFetchedAt: String?
    let arrivals: [Arrival]
    let arrivalFetchedAt: String?
    let warnings: [String]
    func predictions(at now: Date) -> [Prediction] {
        guard FeedDate.fresh(arrivalFetchedAt, at: now), let stamp = FeedDate.parse(arrivalFetchedAt) else { return [] }
        return arrivals.enumerated().compactMap { index, arrival in
            let direction = (arrival.pattern?.directionType ?? arrival.pattern?.direction ?? "").trimmingCharacters(in: .whitespaces).lowercased()
            guard arrival.route?.id == routeID, direction == "loop", arrival.secondsToArrival.isFinite,
                  arrival.secondsToArrival >= 0 else { return nil }
            let due = stamp.addingTimeInterval(arrival.secondsToArrival)
            let scheduled = arrival.schedulePrediction == true || arrival.vehicle == nil
            guard due > now, scheduled || arrival.vehicle?.fresh(at: now) == true else { return nil }
            return Prediction(id: "\(routeID):\(index):\(due.timeIntervalSince1970)", due: due, scheduled: scheduled, vehicle: arrival.vehicle)
        }.sorted { $0.due < $1.due }
    }
}

struct Commute: Codable, Equatable {
    var lot = "South"
    var terminal = "Terminal B (TBIT)"
    var terminalStopID = 0
    var terminalStopName = ""
    var parkingStopID = 0
    var parkingStopName = ""
    var walkingMinutes = 7
    var bufferMinutes = 2
    mutating func normalize() {
        if ShuttleRoute(rawValue: lot) == nil { lot = "South" }
        if !Self.terminals.contains(terminal) { terminal = "Terminal B (TBIT)" }
        walkingMinutes = min(45, max(1, walkingMinutes))
        bufferMinutes = min(10, max(0, bufferMinutes))
    }
    static let terminals = ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal B (TBIT)", "Terminal 4", "Terminal 5", "Terminal 6", "Terminal 7", "Terminal 8"]
}

enum RouteShape {
    static func decode(_ text: String) -> [CLLocationCoordinate2D] {
        let bytes = Array(text.utf8)
        var cursor = 0, lat = 0, lon = 0
        func read() -> Int? {
            var value = 0, shift = 0
            while cursor < bytes.count, shift <= 30 {
                let byte = Int(bytes[cursor]) - 63
                cursor += 1
                guard (0...63).contains(byte) else { return nil }
                value |= (byte & 31) << shift
                if byte < 32 { return value & 1 == 1 ? ~(value >> 1) : value >> 1 }
                shift += 5
            }
            return nil
        }
        var coordinates: [CLLocationCoordinate2D] = []
        while cursor < bytes.count {
            guard let a = read(), let b = read() else { return [] }
            lat += a; lon += b
            let point = CLLocationCoordinate2D(latitude: Double(lat) / 100_000, longitude: Double(lon) / 100_000)
            guard abs(point.latitude) <= 90, abs(point.longitude) <= 180 else { return [] }
            coordinates.append(point)
        }
        return coordinates
    }
}
