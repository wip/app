<p align=center><a href="https://github.com/wip/app/tree/master/assets"><img src="https://github.com/wip/app/raw/master/assets/wip-logo.png" alt="" width="200" height="200"></a></p>

<h1 align="center">DO NOT MERGE – as a service.</h1>

<p align="center">
  <a href="https://stats.uptimerobot.com/Dq46zf6PY" rel="nofollow"><img src="https://img.shields.io/uptimerobot/status/m779429441-a6394a1f5546b634ac6b52f8.svg" alt="Uptime Robot status"></a>
  <a href="https://travis-ci.com/wip/app" rel="nofollow"><img alt="Build Status" src="https://travis-ci.com/wip/app.svg?branch=master"></a>
  <a href="https://coveralls.io/github/wip/app?branch=master" rel="nofollow"><img alt="Coverage Status" src="https://coveralls.io/repos/github/wip/app/badge.svg?branch=master"></a>
  <a href="https://greenkeeper.io/" rel="nofollow"><img src="https://badges.greenkeeper.io/wip/app.svg" alt="Greenkeeper badge"></a>
</p>

![WIP bot screencast](https://github.com/wip/app/raw/master/assets/wip.gif)

By default, WIP is setting a pull request status to pending if it finds one of the following terms in the pull request titles

- wip
- work in progress
- :construction: 

The pro plan allows for [configuration](#configuration) of both the terms and the locations that the app is looking for the terms. The pending status can be overwritten by adding `@wip ready for review` to the pull request body.

:robot::postal_horn: If you use the WIP app we strongly recommend to [subscribe to the updates](https://github.com/wip/app/issues/89)

## Configuration

Repositories belonging to an account or organization with a Pro plan subscription can be configured by creating a `.github/wip.yml` file. Two options can be configured

1. **locations**: any of `title` (pull request title), `label_name` and `commit_subject` (1st line of the pull request’s commit messages). Default: `title`
2. **terms**: list of strings to look for in the defined locations. All terms are case-insensitive. Default: "wip", "work in progress" and ":construction:"

Example:

```yaml
locations:
- title
- label_name
- commit_subject
terms:
- do not merge
- ⛔
```

The above configuration makes WIP look for "do not merge" and ":no_entry:" in the pull request title, all assigned label names and all commit subjects.

You can also configure different terms for different locations:

```yaml
- terms: ⛔
  locations:
  - title
  - label_name
- terms:
  - fixup!
  - squash!
  locations: commit_subject
```

The above configuration looks first for :no_entry: in the pull request title and assigned label names. After that it looks for `fixup!` and `squash!` in the commit subjects.

## About WIP

Besides being a hopefully useful GitHub application, the WIP app is also meant as a reference implementation ([source code](https://github.com/wip/app)). I try to keep the complexity low and the code easy to follow. If you are thinking of creating your own GitHub app, the WIP might be a good starting point for you.

Besides the code, I also made our [policies](https://github.com/wip/policies) good templates for your app.

All revenue from the "pro" plan will be donated to [Rails Girls Summer of Code](https://railsgirlssummerofcode.org/). I only added the paid plan to make the WIP a real-life GitHub App example. If you cannot pay but depend on the pro features you can add your account with an explanation to the [`pro-plan-for-free.js` file](pro-plan-for-free.js).

If you have any questions, please don’t hesitate to create an issue.

## Credits

The WIP app was created by [Gregor Martynus](https://github.com/gr2m). You can follow him on twitter at [@gr2m](https://twitter.com/gr2m).

The logo was created by [Micah Ilbery](https://github.com/micahilbery).

## Legal

License: [Apache 2.0](LICENSE). [Privacy Policy](https://github.com/wip/policies/blob/master/PRIVACY.md). [Security Policy](https://github.com/wip/policies/blob/master/SECURITY.md). [Code of Conduct](CODE_OF_CONDUCT.md)
