# Contributing

👋 Thanks for your interest in contributing to the WIP app! I’m glad you're here and excited to help you get started if you have any questions. For now, here are some basic instructions for how I manage this project.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Local setup

Setup the repository

```
git clone git@github.com:wip/app.git wip-app
cd wip-app
npm install
```

Run the tests

```
npm test
```

If you see an error than something is wrong with the setup. Usually the error message and some research online should be enough to resolve it. But if you can’t figure it out please create an issue and I’ll try to help you out.

## Build your own

Once the setup looks good, you can follow the Probot documentation to [create and configure your own GitHub app](https://probot.github.io/docs/development/#configuring-a-github-app).

## Reporting a bug

If you run into a problem with the app, please create an issue describing how to reproduce it. Ideally you will be able to create an automated test that reproduces the problem. You can start a pull request with just a failing test, we can then collaborate on resolving the problem.

## Suggesting a new feature

Note that the WIP is simple by design. I’m sure there are plenty of features that could be added with just a little bit of code. But in most cases we probably won’t add it to the WIP itself. But please suggest it anyway, we can have a discussion and maybe you can create your own application with additional features and WIP some users might be interested in using it instead of WIP. I’d be happy to mention your app in the README.md once we have a few "forks" that are worth mentioning.

## Maintainers: deploying WIP (Beta)

1. Update `now.json`

  ```diff
  diff --git a/now.json b/now.json
  index c28efe9..b66fc35 100644
  --- a/now.json
  +++ b/now.json
  @@ -1,6 +1,6 @@
  {
  -  "name": "wip",
  -  "alias": "wip",
  +  "name": "wip-beta",
  +  "alias": "wip-beta",
    "scale": {
      "all": {
        "min": 1,
  @@ -8,14 +8,14 @@
      }
    },
    "env": {
  -    "APP_ID": "@app-id",
  -    "APP_NAME": "WIP",
  +    "APP_ID": "@beta-app-id",
  +    "APP_NAME": "WIP (beta)",
      "DISABLE_STATS": "true",
  -    "LOG_LEVEL": "@log-level",
  +    "LOG_LEVEL": "@beta-log-level",
      "LOGDNA_API_KEY": "@logdna-api-key",
      "NODE_ENV": "production",
  -    "PRIVATE_KEY": "@private-key",
  +    "PRIVATE_KEY": "@beta-private-key",
      "SENTRY_DSN": "@sentry-dsn",
  -    "WEBHOOK_SECRET": "@webhook-secret"
  +    "WEBHOOK_SECRET": "@beta-webhook-secret"
    }
  }
  ```

2. Update `deploy.sh` if you plan to continously deploy from GitHub. Not needed when only deploying locally

  ```diff
  diff --git a/scripts/deploy.sh b/scripts/deploy.sh
  index a70ffa9..ae50b8f 100755
  --- a/scripts/deploy.sh
  +++ b/scripts/deploy.sh
  @@ -3,8 +3,8 @@ set -e
  
  now="npx now --debug --token=$NOW_TOKEN"
  
  -echo "$ now rm --safe --yes wip"
  -$now rm --safe --yes wip
  +echo "$ now rm --safe --yes wip-beta"
  +$now rm --safe --yes wip-beta
  
  # https://github.com/zeit/now-cli/blob/master/errors/verification-timeout.md
  echo "$ now --no-verify"
  ```

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
