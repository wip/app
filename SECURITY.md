# Security Policy

1. [Reporting security problems to WIP](#reporting)
2. [Security Point of Contact](#contact)
3. [Incident Response Process](#process)
4. [Vulnerability Management Plan](#vulnerability-management)
5. [License](#credit)

<a name="reporting"></a>
## Reporting security problems to WIP

**DO NOT CREATE AN ISSUE** to report a security problems. Instead please
send an email to wip.incident-response@martynus.net

<a name="contact"></a>
## Security Point of Contact

The security point of contact is Gregor Martynus. Gregor responds to security
incident reports as fast as possible, within one business day at the latest.

In case Gregor does not respond within a reasonable time, the secondary point
of contact is [Brandon Keepers](https://github.com/bkeepers). Brandon is the
only other person with administrative access to the WIP App Settings.

If neither Gregor nor Brandon responds then please contact support@github.com
who can disable any access for the WIP app until the security incident is resolved.

<a name="process"></a>
## Incident Response

In case an incident is discovered or reported, I will follow the following
process to contain, respond and remediate:

### 1. Containment

The first step is to find out the root cause, nature and scope of the incident.

- Is still ongoing? If yes, first priority is to stop it.
- Is the incident outside of my influence? If yes, first priority is to contain it.
- Find out knows about the incident and who is affected.
- Find out what data was potentially exposed.

One way to immediately remove all access for the WIP app is to remove the
private key from the WIP App Settings page. The access can be recovered later
by generating a new private key and re-deploy the app.

### 2. Response

After the initial assessment and containment to my best abilities, I will
document all actions taken in a response plan.

I will create a comment in the official "Updates" issue to inform users about
the incident and what I actions I took to contain it.

### 3. Remediation

Once the incident is confirmed to be resolved, I will summarize the lessons
learned from the incident and create a list of actions I will take to prevent
it from happening again.

<a name="vulnerability-management"></a>
## Vulnerability Management Plans

### Keep permissions to a minimum

The WIP App uses the least amount of access to limit the impact of possible
security incidents, see [Information collection and use](PRIVACY_POLICY.md#information-collection-and-use).

If someone would get access to the WIP app, the worst thing they could do is to
read out contents from pull requests, limited to repositories the WIP got
installed on.

### Secure accounts with access

The [WIP GitHub Organization](https://github.com/wip) requires 2FA authorization
for all members.

### Critical Updates And Security Notices

We learn about critical software updates and security threats from these sources

1. GitHub Security Alerts
2. [Greenkeeper](https://greenkeeper.io/) Dependency Updates
3. GitHub: https://status.github.com/ & [@githubstatus](https://twitter.com/githubstatus)
4. Zeit (Hosting): https://zeit-status.co/ & [@zeit_status](https://twitter.com/zeit_status)
5. Travis (CI/CD): https://www.traviscistatus.com/ & [@traviscistatus](https://twitter.com/traviscistatus)

<a name="credit"></a>
## Credit

This Security Policy is based on [npm’s Security Policy](https://www.npmjs.com/policies/security).
It may be reused under a [Creative Commons Attribution-ShareAlike License](https://creativecommons.org/licenses/by-sa/4.0/).
