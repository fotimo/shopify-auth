import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, {verifyRequest} from "@shopify/koa-shopify-auth";
import Shopify, {ApiVersion} from "@shopify/shopify-api";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import ShopifySession from "@shopify/shopify-api/dist/auth/session";

// set .env parameters
dotenv.config();

// custom Session Storage in Mysql Database
const {storeCallback, loadCallback, deleteCallback, setOfflineAccessToken} = require('./customSessionStorage');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({
    dev,
});
const handle = app.getRequestHandler();

Shopify.Context.initialize({
    API_KEY: process.env.SHOPIFY_API_KEY,
    API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SCOPES.split(","),
    HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
    API_VERSION: ApiVersion.April21,
    IS_EMBEDDED_APP: true,
    // This should be replaced with your preferred storage strategy
    SESSION_STORAGE: new Shopify.Session.CustomSessionStorage(
        storeCallback,
        loadCallback,
        deleteCallback,
    ),
    //SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS = {};

app.prepare().then(async () => {
    const server = new Koa();
    const router = new Router();
    // important to catch for post parameters in request body
    router.use(bodyParser());
    server.keys = [Shopify.Context.API_SECRET_KEY];

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

    const handleRequest = async (ctx) => {
        await handle(ctx.req, ctx.res);
        ctx.respond = false;
        ctx.res.statusCode = 200;
    };

    router.post("/webhooks", async (ctx) => {
        try {
            await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
            console.log(`Webhook processed, returned status code 200`);
        } catch (error) {
            console.log(`Failed to process webhook: ${error}`);
        }
    });

    router.post(
        "/graphql",
        verifyRequest({returnHeader: true}),
        async (ctx, next) => {
            await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
        }
    );

    router.get("(/_next/static/.*)", handleRequest); // Static content is clear
    router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear
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

    server.use(router.allowedMethods());
    server.use(router.routes());
    server.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
    });
});


