#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

version=$1

if [ ! -x "$(which npm 2>/dev/null)" ]; then
    echo "No npm executable found."
    exit 1
fi

npm install
npm install bower
node_modules/bower/bin/bower install
npm dedupe

mkdir -p ../manticore-${version}/
rm -rf ../manticore-${version}/*
for file in `git ls-files`; do
    mkdir -p ../manticore-${version}/$(dirname ${file})
    cp -a ${file} ../manticore-${version}/${file}
done

cp -a client/bower_components ../manticore-${version}/client/.
cp -a node_modules ../manticore-${version}/.

wd=$(pwd)
pushd ..
tar czvf ${wd}/manticore-${version}+deps.tar.gz manticore-${version}/
popd
