require 'json'

# The package and product name must stay TappCapacitorSdk because the Capacitor CLI derives it from the npm name.
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'TappCapacitorSdk'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['homepage'] || package['repository']['url']
  s.author = package['author']
  s.source = { :git => package['repository']['url'], :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift}'
  s.resource_bundles = { 'TappCapacitorSdkPrivacy' => ['ios/Sources/TappCapacitorPlugin/PrivacyInfo.xcprivacy'] }
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.dependency 'Tapp', '= 1.1.23'
  s.dependency 'Tapp-Networking', '= 1.1.7'
  s.swift_version = '5.9'
end
