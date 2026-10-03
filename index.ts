import { App, getEnv } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import product from "#app/pages/product";
import checkoutReturn from "#app/pages/checkout-return";
import download from "#app/pages/download";
import library from "#app/pages/library";
import signin from "#app/pages/signin";
import admin from "#app/pages/admin";
import adminProducts from "#app/pages/admin-products";
import checkoutTest from "#app/pages/checkout-test";
import serveCover from "#app/routes/covers";
import downloadFile from "#app/routes/download-file";
import stripeWebhook from "#app/routes/stripe-webhook";
import { stripeConfigured } from "#app/shared/stripe";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";

if (getEnv() === "production" && !stripeConfigured()) {
  throw new Error("STRIPE_SECRET_KEY is required in production.");
}

const app = new App();

app.route("/", home);
app.route("/products/:slug", product);
app.route("/signin", signin);
app.route("/admin", admin);
app.route("/admin/products", adminProducts);
app.route("/covers/:id/:hash", serveCover);
app.route("/checkout/return", checkoutReturn);
app.route("/checkout/test/:orderId", checkoutTest);
app.route("/download/:token", download);
app.route("/download/:token/file", downloadFile);
app.route("/library/:token", library);
app.route({ method: "post", path: "/stripe/webhook", handler: stripeWebhook });

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
