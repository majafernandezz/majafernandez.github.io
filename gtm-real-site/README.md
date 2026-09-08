# Tag Manager on a real site — a hands-on course

A small pretend web shop, Fika & Co, and six exercises. You install your own Google Tag Manager
container on the shop by hand, then track it the way real sites are tracked: nested dataLayer
values, custom events, ecommerce, shared settings. Then you publish, verify in GA4, and write the
specification for an event the site is missing.

## Get started

**1. Unzip this folder.** Keep it whole. Every file in it is needed.

**2. Upload the whole `gtm-real-site` folder to your GitHub Pages repository**, at the top level.
Your pages are then at:

```
https://yourname.github.io/gtm-real-site/
```

**3. Open that address and do exercise 0, "Before you start".** It walks you through creating
a free Google Tag Manager container and a free Google Analytics property, and putting this folder
online with GitHub Pages. Every step is written out.

**4. Then do exercises 1 to 6 in order.** Exercise 1 has you paste your own Tag Manager code
into the shop's five HTML files. There is no settings file and no box to paste an ID into: on a
real website the code goes into the pages, so that is what you do here.

## What is in here

| Folder / file | Contents |
|---|---|
| `index.html` | Start here. What to set up, the workflow, links to every exercise. |
| `0-before-you-start.html` | Accounts, and putting the folder online. Do this first. |
| `1-install.html` … `6-publish-and-spec.html` | The six exercises, in order. |
| `site/` | The practice shop: five pages, `site.js` (the "developer's" dataLayer pushes) and `site.css`. **This is where you paste your snippet (exercise 1) and add one push (exercise 6).** |
| `assets/` | Styling, screenshots, and the Developer view panel for the shop pages. Leave alone. |
| `reference/glossary.html` | Every word the course uses. |

## The events the site pushes

| When | Event | Nested values |
|---|---|---|
| Every page, before the container loads | *(none)* | `page.type`, `page.category`, `user.id`, `user.tier`, `user.consent.marketing` |
| A call-to-action is clicked | `cta_click` | `cta.text`, `cta.location`, `cta.destination` |
| The demo Log in / Log out button | `login`, `logout` | `user.*` |
| The subscribe form | `generate_lead` | `lead.plan`, `lead.bag_size`, `lead.value`, `user.consent.marketing` |
| The shop | `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` | GA4 `ecommerce` object, `ecommerce.items.0.*` |
| After a purchase | `order_details` | `order.id`, `order.delivery.method`, `order.payment.method` |
| The footer newsletter form | *nothing, yet* | You specify and build it in exercise 6 |

## Two things to know

**Preview mode needs the site online.** Tag Assistant cannot connect to a file opened from your
disk. Upload first, then preview.

**There is already a container snippet in each site page.** It belongs to the course author and
stays there. You paste yours in the marked place below it. Two containers on one page is normal.

## Nothing here sends data anywhere

Until you install a container of your own, these pages only write to the browser's own dataLayer.
The shop sells nothing, the forms send nothing.

---

Course material by Jesper Åström.
