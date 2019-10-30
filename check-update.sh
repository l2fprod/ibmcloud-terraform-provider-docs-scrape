#!/bin/bash
set -e

# get latest provider version
function get_latest {
  latest_content=$(curl -H "Authorization: token $GITHUB_TOKEN" --silent "https://api.github.com/repos/$1/releases/latest")
  if (echo $latest_content | grep "browser_download_url" | grep -q $2 >/dev/null); then
    echo $latest_content | jq -r .tag_name
  else
    echo "Failed to get $1: $latest_content"
    exit 2
  fi
}

VERSION=$(get_latest "IBM-Cloud/terraform-provider-ibm" "linux_amd64")

# run the generator
npm install
npm run build
npm start $VERSION

# compare with current version in plugin
curl -L -H "Authorization: token $GITHUB_TOKEN" https://github.com/l2fprod/vscode-terraform/raw/develop/src/data/terraform-provider-ibm.json > current-terraform-provider-ibm.json

if diff terraform-provider-ibm.json current-terraform-provider-ibm.json; then
  exit 0
else
  echo "Needs an update!"
  exit 1
fi