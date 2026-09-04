# Google Tag Manager — hands-on course

Twenty practice pages built to be tracked. Put them on your own website, point your own
Tag Manager container at them, and build tags against them.

## Get started in three steps

**1. Unzip this folder.**

**2. Put your container ID in one file.**

Open `assets/config.js` and paste your ID between the quotes:

```js
window.GTM_COURSE_CONFIG = {
    containerId: 'GTM-A1B2C3D',
    hideConnectBox: false
};
```

Find the ID at the top right of your Tag Manager workspace. It starts with `GTM-`.

**3. Upload the whole `gtm-course` folder to your GitHub Pages repository.**

Put it at the top level. Your pages will then be at:

```
https://yourname.github.io/gtm-course/
```

Open that address and start at exercise 1.1.

## If you skip step 2

The pages still work. Paste your container ID into the box under the dataLayer panel on
any page, or add `?gtm=GTM-A1B2C3D` to the address. Both are remembered in your browser,
but only for you — editing `config.js` is what makes it work for everyone.

## What is in here

| Folder | Contents |
|---|---|
| `index.html` | Start here. Links to every module. |
| `01-gtm-basics/` | Container, GA4 install, click and form triggers, variables, scroll and visibility |
| `02-datalayer/` | Custom events, hashing user data, values stored across pages |
| `03-url-parameters/` | Reading parameters, campaigns, personalisation, virtual pageviews |
| `04-ecommerce/` | A demo shop pushing the six GA4 ecommerce events |
| `reference/` | Container setup guide and a glossary |
| `assets/config.js` | **Your settings. The only file you need to edit.** |
| `assets/course.css`, `assets/course.js` | Shared styling and the live dataLayer panel. Leave alone. |

## Two things to know

**Your site's own GTM snippet does not reach these pages.** They are standalone HTML files
and do not use your site's template. That is what `config.js` is for. Do not also paste the
container snippet into these pages — the container would load twice and every tag would fire
twice.

**Opening the files by double-clicking mostly works,** but the browser blocks two things on
`file://` addresses: the SHA-256 hashing in exercise 2.2, and remembering your container ID
between pages. Upload to GitHub Pages and both work.

## Nothing here sends data anywhere

Until you connect a container of your own, these pages only write to the browser's own
dataLayer and console. The demo forms and the demo shop are not connected to anything.

---

Course material by [Jesper Åström](https://jesperastrom.github.io/).
