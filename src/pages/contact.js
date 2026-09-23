import { esc, attr, map, when } from "../templates/html.js";
import { pageHero, section, button, pendingFlag } from "../templates/components.js";
import { site } from "../data/site.js";

export default {
  slug: "/contact/",
  title: "Contact",
  description:
    "Join PSGIM E-Cell. Open to every department and both years — fill the interest form or email the team.",
  priority: "0.8",

  render() {
    const email = site.contact.email;
    const form = site.contact.interestForm;

    return [
      pageHero({
        kicker: "Get involved",
        title: "Bring an idea, or come find one",
        lede: "Open to every department and both years. Tell us what pulls you in and we’ll add you to the next session.",
      }),

      section({
        inner: `<div class="contact-grid">
  <div>
    <h2 class="sr-only" id="form-heading">Interest form</h2>
    ${
      form.value
        ? `<form class="form" action="${attr(form.value)}" method="post">
      <label class="field"><span>Name</span><input type="text" name="name" autocomplete="name" required></label>
      <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
      <label class="field"><span>Roll number</span><input type="text" name="roll" autocomplete="off"></label>
      <label class="field"><span>What pulls you in?</span>
        <select name="interest">
          <option>Just curious</option>
          <option>I have an idea</option>
          <option>I want to help run events</option>
          <option>Design / social media</option>
          <option>The NEC campaign team</option>
        </select>
      </label>
      <label class="field"><span>Anything else</span><textarea name="note" rows="3"></textarea></label>
      ${button({ label: "Send", variant: "accent", size: "lg" })}
    </form>`
        : /* No form endpoint exists yet. The previous site shipped a full set
             of inputs wired to nothing — it looked like it worked, silently
             discarded what people typed, and told them so only in small grey
             text underneath. Better to not take the details at all until
             there is somewhere to put them. */
          `<div class="awaiting">
      <p class="awaiting__head">Interest form</p>
      <p class="awaiting__body">The sign-up form is being set up. Until it is live, email the team directly — the address below reaches the whole core team, and you will get the same reply.</p>
    </div>
    <div class="row" style="margin-top:var(--s-5)">
      ${
        email.pending
          ? button({ label: "Find us on campus", href: "#find", variant: "secondary", size: "lg" })
          : button({ label: "Email the team", href: `mailto:${email.value}`, variant: "accent", size: "lg" })
      }
    </div>`
    }
  </div>

  <div>
    <h2 class="sr-only">Contact details</h2>
    <dl class="detail-list" id="find">
      <div>
        <dt>Email</dt>
        <dd>${
          email.pending
            ? `${esc(email.value)}<br>${pendingFlag("Mailbox being confirmed with the office")}`
            : `<a href="mailto:${attr(email.value)}">${esc(email.value)}</a>`
        }</dd>
      </div>
      ${map(site.social, (s) => `<div>
        <dt>${esc(s.name)}</dt>
        <dd>${s.url ? `<a href="${attr(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.handle)}</a>` : `${esc(s.handle)}<br>${pendingFlag("Account link to be confirmed")}`}</dd>
      </div>`)}
      <div>
        <dt>Find us</dt>
        <dd>${map(site.address.lines, (l, i) => `${i ? "<br>" : ""}${esc(l)}`)}</dd>
      </div>
      <div>
        <dt>NEC 2026</dt>
        <dd><a href="/nec/">The campaign, and how to join the team →</a></dd>
      </div>
    </dl>
  </div>
</div>`,
      }),
    ].join("\n");
  },
};
