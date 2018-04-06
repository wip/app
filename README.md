# wip-bot

[![Uptime Robot status](https://img.shields.io/uptimerobot/status/m779429441-a6394a1f5546b634ac6b52f8.svg)](https://stats.uptimerobot.com/Dq46zf6PY) [![Build Status](https://travis-ci.org/gr2m/wip-bot.svg?branch=master)](https://travis-ci.org/gr2m/wip-bot) [![Greenkeeper badge](https://badges.greenkeeper.io/gr2m/wip-bot.svg)](https://greenkeeper.io/)

> DO NOT MERGE – as a service.

![WIP bot screencast](assets/wip.gif)

## Usage

1. Install the app on your GitHub Repositories: [github.com/apps/wip](https://github.com/apps/wip)
2. The WIP bot sets status of the request title to pending if it finds  "wip", "work in progress" or "do not merge" (not case-sensitive) in
   1. The pull request title
   2. One of the pull request labels
   3. One of the pull request commit messages
3. If it doesn’t find the words anywhere, it will set status to success

## Local setup

- Setup repository

  ```
  git clone git@github.com:gr2m/wip-bot.git
  cd wip-bot
  npm install
  ```
- Create your own GitHub app: [instructions](https://probot.github.io/docs/development/#configure-a-github-app)
- On your local machine, copy `.env.example` to `.env`.
- Go to [smee.io](https://smee.io) and click **Start a new channel**. Set `WEBHOOK_PROXY_URL` in `.env` to the URL that you are redirected to.
- [Create a new GitHub App](https://github.com/settings/apps/new) with:
  - **Webhook URL**: Use your `WEBHOOK_PROXY_URL` from the previous step.
  - **Webhook Secret**: `development`.
  - **Permissions & events**
    - Commit statuses **(read & write)**
    - Pull Requests **(read only)**
    - Subscribe to events **Pull request**
- Download the private key and move it to your project's directory. It will get picked up by Probot automatically.
- Edit `.env` and set `APP_ID` to the ID of the app you just created. The App ID can be found in your app settings page here
- Run `$ npm start` to start the server/

## Contribute

If you’d like to contribute a bug fix or feature to `wip-bot`, please fork the repository, then clone it to your computer. Then install dependencies and run the tests

```
npm install
npm test
```

Before adding a feature, create an issue first to ask if it’s within the scope of the app. If possible, add tests to your pull requests.

## License

[Apache 2.0](LICENSE)
