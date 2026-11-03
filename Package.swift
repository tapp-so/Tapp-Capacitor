// swift-tools-version: 5.9
// The package and product name must stay TappCapacitorSdk because the Capacitor CLI derives it from the npm name.
import PackageDescription

let package = Package(
    name: "TappCapacitorSdk",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "TappCapacitorSdk", targets: ["TappCapacitorPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", "6.0.0"..<"9.0.0"),
        .package(url: "https://github.com/tapp-so/Tapp-iOS.git", exact: "1.1.23"),
        .package(url: "https://github.com/tapp-so/Tapp-Networking-iOS.git", exact: "1.1.7")
    ],
    targets: [
        .target(
            name: "TappCapacitorPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "Tapp", package: "Tapp-iOS"),
                .product(name: "TappNetworking", package: "Tapp-Networking-iOS")
            ],
            path: "ios/Sources/TappCapacitorPlugin",
            resources: [.copy("PrivacyInfo.xcprivacy")]
        ),
        .testTarget(
            name: "TappCapacitorPluginTests",
            dependencies: ["TappCapacitorPlugin"],
            path: "ios/Tests/TappCapacitorPluginTests"
        )
    ]
)
