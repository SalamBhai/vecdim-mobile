#!/bin/bash
set -e

echo "=========================================================="
echo " Packaging VECDIM Mobile for iOS (.ipa)"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

# 1. Clean previous build artifacts
echo "--> Cleaning previous build directory..."
rm -rf build/Payload build/VECDIMSurveillance.ipa build/derivedData

# 2. Build iOS Release Application Bundle using xcodebuild
echo "--> Compiling Release binary with xcodebuild..."
xcodebuild -workspace ios/VECDIMSurveillance.xcworkspace \
  -scheme VECDIMSurveillance \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath build/derivedData \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  -quiet

# 3. Verify .app bundle was produced
APP_PATH="build/derivedData/Build/Products/Release-iphoneos/VECDIMSurveillance.app"
if [ ! -d "${APP_PATH}" ]; then
  echo "Error: ${APP_PATH} not found!"
  exit 1
fi

# 4. Assemble standard iOS IPA Payload
echo "--> Assembling Payload directory..."
mkdir -p build/Payload
cp -r "${APP_PATH}" build/Payload/

# 5. Compress into .ipa
echo "--> Creating VECDIMSurveillance.ipa..."
cd build
zip -q -r VECDIMSurveillance.ipa Payload
cd "${ROOT_DIR}"

echo "=========================================================="
echo " Successfully created .ipa package!"
echo " Location: ${ROOT_DIR}/build/VECDIMSurveillance.ipa"
echo "=========================================================="
ls -lh build/VECDIMSurveillance.ipa
