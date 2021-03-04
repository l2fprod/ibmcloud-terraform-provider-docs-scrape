#!/bin/bash
set -e

if [ -d provider-docs ]; then
  (cd provider-docs && git pull)
else
  git clone https://github.com/ibm-cloud-docs/ibm-cloud-provider-for-terraform provider-docs
fi

# run the generator
npm install
npm start

# compare with current version in plugin
curl -L -H "Authorization: token $GITHUB_TOKEN" https://github.com/l2fprod/vscode-terraform/raw/develop/src/data/terraform-provider-ibm.json > current-terraform-provider-ibm.json

if diff -b terraform-provider-ibm.json current-terraform-provider-ibm.json; then
  exit 0
else
  echo "Needs an update!"
  exit 1
fi
