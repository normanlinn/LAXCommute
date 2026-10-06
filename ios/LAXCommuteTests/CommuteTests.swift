import XCTest
import UIKit
@testable import LAXCommute

final class CommuteTests: XCTestCase {
    func testUploadedFontsAreRegisteredInTheRunningApp() {
        XCTAssertNotNil(UIFont(name: "Z06Walone", size: 17))
        XCTAssertNotNil(UIFont(name: "Z06Walone-Bold", size: 17))
    }
    func testEastDefaultsToOwnLotAndIncludesSouthStops() {
        let stops = [Stop(id: 1, name: "South Lot Stop #1", lat: 33.94, lon: -118.4),
                     Stop(id: 2, name: "East Lot", lat: 33.94, lon: -118.4),
                     Stop(id: 3, name: "Terminal 1", lat: 33.94, lon: -118.4),
                     Stop(id: 4, name: "South Lot Drop-off", lat: 33.94, lon: -118.4)]
        XCTAssertEqual(Stop.boarding(stops, route: .east, direction: .work).map(\.id), [2, 1])
        XCTAssertEqual(Stop.boarding(stops, route: .east, direction: .parking).map(\.id), [3])
    }
    func testWestIncludesSouthStops() {
        let stops = [Stop(id: 1, name: "South Lot Stop #3", lat: 33.94, lon: -118.4),
                     Stop(id: 2, name: "West Lot", lat: 33.94, lon: -118.4)]
        XCTAssertEqual(Stop.boarding(stops, route: .west, direction: .work).map(\.id), [2, 1])
    }
    func testStaleAndFutureDataIsRejected() {
        let now = Date(timeIntervalSince1970: 1_700_000_000)
        XCTAssertFalse(FeedDate.fresh("2023-11-14T22:11:40Z", at: now))
        XCTAssertFalse(FeedDate.fresh("2023-11-14T22:20:00Z", at: now))
        XCTAssertTrue(FeedDate.fresh("2023-11-14T22:13:10Z", at: now))
    }
    func testPolylineAndMalformedInput() {
        let points = RouteShape.decode("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
        XCTAssertEqual(points.count, 3)
        XCTAssertEqual(points[0].latitude, 38.5, accuracy: 0.00001)
        XCTAssertEqual(points[2].longitude, -126.453, accuracy: 0.00001)
        XCTAssertTrue(RouteShape.decode("~").isEmpty)
    }
    func testScheduledPredictionsAreLabelledAndWrongRoutesRejected() throws {
        let data = Data(#"{"routeID":6884,"stopID":1,"vehicles":[],"vehicleFetchedAt":null,"arrivalFetchedAt":"2023-11-14T22:13:20Z","warnings":[],"arrivals":[{"secondsToArrival":120,"route":{"id":6884},"pattern":{"directionType":"loop"},"schedulePrediction":true},{"secondsToArrival":120,"route":{"id":6883},"pattern":{"directionType":"loop"},"schedulePrediction":true}]}"#.utf8)
        let live = try JSONDecoder().decode(LiveSnapshot.self, from: data)
        let predictions = live.predictions(at: Date(timeIntervalSince1970: 1_700_000_010))
        XCTAssertEqual(predictions.count, 1)
        XCTAssertTrue(predictions[0].scheduled)
    }
    func testProfileUsesWebsiteCompatibleKeys() throws {
        let data = try JSONEncoder().encode(Commute())
        let value = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(value["terminalStopID"] as? Int, 0)
        XCTAssertEqual(value["lot"] as? String, "South")
        XCTAssertNotNil(value["walkingMinutes"])
    }
}
