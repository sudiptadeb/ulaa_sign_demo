#!/bin/bash

# Check if zip command is available
if ! command -v zip &> /dev/null
then
    echo "zip command not found. Please install zip."
    exit 1
fi

# Create a temporary directory for packaging
TEMP_DIR="ulaa_sign_demo"
mkdir -p $TEMP_DIR

# Copy the specified files and folders into the temporary directory
cp -r dist tls admin.html app.py build.sh CertUtils.js index.html modules.js package.json rollup.config.js rootCAs.json styles.css vue2.js $TEMP_DIR

# Create the zip file
ZIP_FILE="ulaa_sign_demo.zip"
zip -r $ZIP_FILE $TEMP_DIR

# Clean up the temporary directory
rm -rf $TEMP_DIR

echo "Created $ZIP_FILE with root folder ulaa_sign_demo."
