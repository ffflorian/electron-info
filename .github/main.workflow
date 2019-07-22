workflow "Build, lint and test" {
  on = "push"
  resolves = [
    "Build project",
    "Lint project",
    "Test project",
    "Publish project"
  ]
}

action "Don't skip CI" {
  uses = "ffflorian/actions/skip-ci-check@v1.0.0"
}

action "Install dependencies" {
  uses = "ffflorian/actions/git-node@v1.0.0"
  needs = "Don't skip CI"
  runs = "yarn"
}

action "Lint project" {
  uses = "ffflorian/actions/git-node@v1.0.0"
  needs = "Install dependencies"
  runs = "yarn"
  args = "lint"
}

action "Build project" {
  uses = "ffflorian/actions/git-node@v1.0.0"
  needs = "Install dependencies"
  runs = "yarn"
  args = "dist"
}

action "Test project" {
  uses = "ffflorian/actions/git-node@v1.0.0"
  needs = "Install dependencies"
  runs = "yarn"
  args = "test"
}

action "Check for master branch" {
  uses = "actions/bin/filter@master"
  needs = [
    "Build project",
    "Lint project",
    "Test project"
  ]
  args = "branch master"
}

action "Publish project" {
  uses = "ffflorian/actions/git-node@v1.0.0"
  needs = "Check for master branch"
  env = {
    GIT_AUTHOR_NAME = "ffflobot"
    GIT_AUTHOR_EMAIL = "ffflobot@users.noreply.github.com"
    GIT_COMMITTER_NAME = "ffflobot"
    GIT_COMMITTER_EMAIL = "ffflobot@users.noreply.github.com"
  }
  runs = "yarn"
  args = "release"
  secrets = ["GH_TOKEN", "NPM_TOKEN"]
}
