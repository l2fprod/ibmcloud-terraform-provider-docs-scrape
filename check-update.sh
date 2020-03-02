#!/bin/bash
set -e

git clone https://github.com/ibm-cloud-docs/terraform provider-docs

# run the generator
npm install
npm start

# compare with current version in plugin
curl -L -H "Authorization: token $GITHUB_TOKEN" https://github.com/l2fprod/vscode-terraform/raw/develop/src/data/terraform-provider-ibm.json > current-terraform-provider-ibm.json

if diff terraform-provider-ibm.json current-terraform-provider-ibm.json; then
  exit 0
else
  echo "Needs an update!"
  exit 1
fi