# Introduction
This demo shows the shopify app (node) authentication process which performs offline and online access mode at the same time.

It is not a ready-made script. I have only attached the most important files for this task.

Thanks to [@luciilucii](https://github.com/luciilucii) for your input.

---

## Setup
* Shopify Boilerplate embedded app made with Node, Next.js, Shopify-koa-auth, Polaris, and App Bridge React. 
* Session storage mode: `CustomSessionStorage`
* Database: `Mysql`

---

## Routing of the `shopifyAuth` process
When installing the app, the first thing we need to do is redirect to the offline access mode process.
`/install/auth?shop=${shop}`

```javascript
router.get("/", async (ctx) => {
        // get shop
        const shop = ctx.query.shop;
        // get current session
        const session = await Shopify.Utils.loadCurrentSession(ctx.req, ctx.res)
        // check if shop is active
        if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
            // if not a active shop - redirect to complete auth process offline & online
            ctx.redirect(`/install/auth?shop=${shop}`);
        } else {

            if (session && session.expires && session.expires <= new Date()) {
                // if active shop but session is expired - redirect to online authProcess
                ctx.redirect(`/auth?shop=${shop}`);
            } else {
                // load app
                await handleRequest(ctx);
            }
        }
    });
```

---

## `shopifyAuth` - 1.Step
In the first step we go through the offline access mode process of the `shopifyAuth`.
We only store the offline access token in our database here and move on to the online access mode process.

```node
// shopify auth - offline accessMode for offline token
server.use(
    createShopifyAuth({
        accessMode: "offline",
        prefix: "/install",
        async afterAuth(ctx) {
            const {
                shop,
                accessToken,
                scope,
            } = ctx.state.shopify;

            // set shopify offline token to database
            await setOfflineAccessToken(shop, accessToken)

            // redirect to shopify auth - online accessMode
            ctx.redirect(`/auth?shop=${shop}`)
        },
    }),
);
```

---

## `shopifyAuth` - 2.Step
In the second step, we go through the normal online access mode process.
After successful `shopifyAuth`, we are redirected to the embedded app.
```node
// shopify auth - online accessMode
server.use(
    createShopifyAuth({
        async afterAuth(ctx) {
            const {
                shop,
                scope,
                accessToken,
            } = ctx.state.shopify

            // set active shop
            ACTIVE_SHOPIFY_SHOPS[shop] = scope;
            // set host for redirect
            const host = ctx.query.host;

            // appUninstallHelper
            const response = await Shopify.Webhooks.Registry.register({
                shop,
                accessToken,
                path: "/webhooks",
                topic: "APP_UNINSTALLED",
                webhookHandler: async (topic, shop, body) =>
                    delete ACTIVE_SHOPIFY_SHOPS[shop],
            });

            if (!response.success) {
                console.log(
                    `Failed to register APP_UNINSTALLED webhook: ${response.result}`
                );
            }

            // redirect to app with shop parameter upon auth
            ctx.redirect(`/?shop=${shop}&host=${host}`);
        },
    }),
);
```

---

## Sessions Data Storage 
Sessions data storage is done via the `customSessionStorage` file.
```node
// custom Session Storage in Mysql Database
const {storeCallback, loadCallback, deleteCallback, setOfflineAccessToken} = require('./customSessionStorage');
```

---

## Important
It is required that two callback URL(s) are stored in the Shopify app settings.

- `/install/auth/callback`
- `/auth/callback`

![This is an image](./callback-urls.png)

### Follow Me
[![Follow me on LinkedIn](https://img.shields.io/badge/LinkedIn-Aregtech-blue?style=flat&logo=linkedin&logoColor=b0c0c0&labelColor=363D44)](https://www.linkedin.com/company/aregtech) 