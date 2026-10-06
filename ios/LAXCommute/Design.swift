import SwiftUI
import UIKit

enum AppLanguage: String, CaseIterable { case en, my }
enum Appearance: String, CaseIterable {
    case system, light, dark
    var scheme: ColorScheme? { switch self { case .system: nil; case .light: .light; case .dark: .dark } }
}

enum Design {
    @MainActor static func configureNativeFonts(_ language: AppLanguage) {
        let regular = language == .my ? UIFont(name: "Z06Walone", size: 13) ?? .systemFont(ofSize: 13) : .systemFont(ofSize: 13)
        let bold = language == .my ? UIFont(name: "Z06Walone-Bold", size: 17) ?? .boldSystemFont(ofSize: 17) : .boldSystemFont(ofSize: 17)
        UITabBarItem.appearance().setTitleTextAttributes([.font: regular], for: .normal)
        UITabBarItem.appearance().setTitleTextAttributes([.font: regular], for: .selected)
        UISegmentedControl.appearance().setTitleTextAttributes([.font: regular], for: .normal)
        UISegmentedControl.appearance().setTitleTextAttributes([.font: regular], for: .selected)
        UINavigationBar.appearance().titleTextAttributes = [.font: bold]
    }
    static let accent = Color(hex: 0x18BDC7)
    static let navy = Color(hex: 0x081923)
    static func background(_ scheme: ColorScheme) -> Color { scheme == .dark ? navy : Color(hex: 0xF7FBFC) }
    static func card(_ scheme: ColorScheme) -> Color { scheme == .dark ? Color(hex: 0x102B35) : .white }
    static func ink(_ scheme: ColorScheme) -> Color { scheme == .dark ? Color(hex: 0xEFFBFC) : Color(hex: 0x14263D) }
    static func muted(_ scheme: ColorScheme) -> Color { scheme == .dark ? Color(hex: 0xADC8CF) : Color(hex: 0x536D78) }
    static func border(_ scheme: ColorScheme) -> Color { Color(hex: scheme == .dark ? 0x5B8490 : 0x66818C) }
    static func route(_ route: ShuttleRoute, _ scheme: ColorScheme) -> Color {
        switch route {
        case .south: Color(hex: scheme == .dark ? 0x58DCE3 : 0x007981)
        case .east: Color(hex: scheme == .dark ? 0x88B7FF : 0x3262AB)
        case .west: Color(hex: scheme == .dark ? 0xE4BB82 : 0xB76328)
        }
    }
    static func font(_ language: AppLanguage, size: CGFloat = 17, bold: Bool = false, relativeTo style: Font.TextStyle = .body) -> Font {
        language == .my
            ? .custom(bold ? "Z06Walone-Bold" : "Z06Walone", size: size, relativeTo: style)
            : .system(style, design: .rounded).weight(bold ? .bold : .regular)
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255, opacity: 1)
    }
}

struct Panel<Content: View>: View {
    @Environment(\.colorScheme) private var scheme
    @ViewBuilder let content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 18) { content }
            .padding(20).frame(maxWidth: .infinity, alignment: .leading)
            .background(Design.card(scheme), in: RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(Design.border(scheme).opacity(0.55), lineWidth: 1))
    }
}

struct PrimaryButton: View {
    let label: String
    let action: () -> Void
    var body: some View {
        Button(action: action) { Text(label).fontWeight(.bold).frame(maxWidth: .infinity).padding(.vertical, 15) }
            .buttonStyle(.plain).foregroundStyle(Design.navy)
            .background(Design.accent, in: RoundedRectangle(cornerRadius: 16))
    }
}
