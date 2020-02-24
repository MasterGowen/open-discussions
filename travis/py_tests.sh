#!/usr/bin/env bash

status=0

function run_test() {
    echo "$@"
    "$@"
    local test_status=$?
    if [ $test_status -ne 0 ]; then
        status=$test_status
    fi
    return $test_status
}

function travis_fold() {
  # hint to travis to fold a section of output
  # this is unofficially supported, but useful
  local action=$1
  local name=$2
  printf "travis_fold:${action}:${name}\r"
}

# check code formatting
travis_fold start format
printf "[Checking code formatting]\n"
run_test black --check . && \
  travis_fold end format

# run the tests
travis_fold start test
printf "[Running pytest]\n"
run_test tox && \
  travis_fold end tests

# upload code coverage
travis_fold start codecov
printf "[Uploading code coverage]\n"
run_test ./travis/codecov_python.sh && \
  travis_fold end codecov

# verify valid migrations
travis_fold start migrations
printf "[Verifying migrations]\n"


# verify valid migrations
travis_fold start migrations
printf "[Verifying migrations]\n"

run_test ./scripts/test/detect_missing_migrations.sh && \
  run_test ./scripts/test/no_auto_migrations.sh && \
  travis_fold end migrations

exit $status
