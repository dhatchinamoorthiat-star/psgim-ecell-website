/**
 * The page manifest. Order here is the order in sitemap.xml.
 *
 * Every route the previous site served is present — /, /about/, /initiatives/,
 * /events/, /team/, /gallery/, /contact/ and /nec/ — so no existing link,
 * QR code or poster breaks.
 */

import home from "./home.js";
import about from "./about.js";
import initiatives from "./initiatives.js";
import events from "./events.js";
import team from "./team.js";
import gallery from "./gallery.js";
import nec from "./nec.js";
import contact from "./contact.js";
import control from "./control.js";

export const pages = [home, about, initiatives, events, team, gallery, nec, contact, control];
