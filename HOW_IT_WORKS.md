# How it works

![architecture](assets/architecture.mermaid.svg)

The WIP GitHub is built with [Probot](https://probot.github.io/) – a Node.js framework for GitHub workflow automation and improvements.

When installed, the WIP app starts receiving request for every [pull request event](https://developer.github.com/v3/activity/events/types/#pullrequestevent), such as "created", "edited" or "labeled". The requests are received by Probot and verified using the Webhook Secret. If the verification succeeds, probot creates an authentication token for the installation and passes both the event request payload as well as the authenticated GitHub API client to the [pull request event handler](lib/handle-pull-request-change.js).

The event handler checks if the installation belongs to a free plan or a paid plan. For the free plan it only checks if the PR title contains one of the default terms such as "WIP" or "🚧". For the paid plan it loads the configuration and gets the status of the pull request based on that.

Finally, it compares the new to the current state and updates if it changed.
