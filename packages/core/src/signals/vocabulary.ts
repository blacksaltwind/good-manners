export const SIGNAL_PATTERNS: Record<string, RegExp[]> = {
  ui: [
    /\bui\b/i,
    /\binterface\b/i,
    /\bscreen\b/i,
    /\bpage\b/i,
    /\bcomponent\b/i,
    /\bdashboard\b/i,
    /\bform\b/i,
    /\bbutton\b/i,
    /<[a-z]/i,
  ],

  interactive: [
    /\bbutton\b/i,
    /\bclick\b/i,
    /\binteractive\b/i,
    /\bcontrol\b/i,
    /\bmenu\b/i,
    /<button\b/i,
    /\bonClick\b/i,
  ],

  form: [
    /\bform\b/i,
    /\binput\b/i,
    /\btextarea\b/i,
    /\bselect\b/i,
    /\bsubmit\b/i,
    /<form\b/i,
  ],

  authentication: [
    /\blogin\b/i,
    /\bsign[ -]?in\b/i,
    /\bsign[ -]?up\b/i,
    /\bpassword\b/i,
    /\bauth\b/i,
    /\bsession\b/i,
  ],

  async: [
    /\basync\b/i,
    /\bawait\b/i,
    /\bfetch\s*\(/i,
    /\bloading\b/i,
    /\bpending\b/i,
    /\bpromise\b/i,
  ],

  mutation: [
    /\bcreat(?:e|es|ed|ing)\b/i,
    /\bupdat(?:e|es|ed|ing)\b/i,
    /\bsav(?:e|es|ed|ing)\b/i,
    /\bsubmit(?:s|ted|ting)?\b/i,
    /\bdelet(?:e|es|ed|ing)\b/i,
    /\bremov(?:e|es|ed|ing)\b/i,
    /\bpost(?:s|ed|ing)?\b/i,
    /\bput(?:s|ting)?\b/i,
    /\bpatch(?:es|ed|ing)?\b/i,
  ],

  destructive: [
    /\bdelet(?:e|es|ed|ing)\b/i,
    /\bremov(?:e|es|ed|ing)\b/i,
    /\bdestroy(?:s|ed|ing)?\b/i,
    /\breset(?:s|ting)?\b/i,
    /\beras(?:e|es|ed|ing)\b/i,
  ],

  irreversible: [
    /\bpermanent(?:ly)?\b/i,
    /\birreversible\b/i,
    /\bcannot be undone\b/i,
  ],

  overlay: [
    /\bmodal\b/i,
    /\bdialog\b/i,
    /\bdrawer\b/i,
    /\bpopover\b/i,
    /<dialog\b/i,
  ],

  'multi-step': [
    /\bwizard\b/i,
    /\bmulti[ -]?step\b/i,
    /\bstep \d+\b/i,
  ],

  navigation: [
    /\bnavigation\b/i,
    /\bnavbar\b/i,
    /\bsidebar\b/i,
    /\broute\b/i,
    /\bbreadcrumb\b/i,
    /\bback button\b/i,
  ],

  search: [
    /\bsearch\b/i,
    /\bfilter(?:s|ed|ing)?\b/i,
    /\bsearch results?\b/i,
  ],

  list: [
    /\blist\b/i,
    /\bfeed\b/i,
    /\bresults\b/i,
  ],

  table: [
    /\btable\b/i,
    /\bgrid\b/i,
    /<table\b/i,
  ],

  selection: [
    /\bselect\b/i,
    /\bchoice\b/i,
    /\boption\b/i,
    /\bcheckbox\b/i,
    /\bradio\b/i,
  ],

  upload: [
    /\bupload\b/i,
    /\bfile input\b/i,
    /type=["']file["']/i,
  ],

  error: [
    /\berrors?\b/i,
    /\bfailures?\b/i,
    /\bfailed\b/i,
    /\bcatch\b/i,
  ],

  validation: [
    /\bvalidation\b/i,
    /\binvalid\b/i,
    /\brequired\b/i,
    /\berror message\b/i,
  ],

  loading: [
    /\bloading\b/i,
    /\bpending\b/i,
    /\bspinner\b/i,
    /\bskeleton\b/i,
  ],

  empty: [
    /\bempty\b/i,
    /\bno results\b/i,
    /\bno data\b/i,
  ],

  status: [
    /\bstatus\b/i,
    /\bsuccess\b/i,
    /\bfailed\b/i,
    /\bsaved\b/i,
  ],

  retry: [
    /\bretry\b/i,
    /\btry again\b/i,
  ],

  network: [
    /\bnetwork\b/i,
    /\boffline\b/i,
    /\bconnection\b/i,
    /\bfetch\s*\(/i,
  ],

  permission: [
    /\bpermission\b/i,
    /\bforbidden\b/i,
    /\bunauthorized\b/i,
    /\baccess denied\b/i,
  ],

  session: [
    /\bsession\b/i,
    /\bsession expired\b/i,
    /\btoken expired\b/i,
  ],

  interruption: [
    /\binterrupt\b/i,
    /\bresume\b/i,
    /\bcontinue later\b/i,
  ],

  partial: [
    /\bpartial\b/i,
    /\bsome failed\b/i,
    /\bsome succeeded\b/i,
  ],

  bulk: [
    /\bbulk\b/i,
    /\bbatch\b/i,
    /\bmultiple items\b/i,
  ],

  recovery: [
    /\brecover\b/i,
    /\brecovery\b/i,
    /\bretry\b/i,
    /\bundo\b/i,
  ],

  'long-running': [
    /\bprogress\b/i,
    /\blong[ -]?running\b/i,
    /\bprocessing\b/i,
    /\bexport\b/i,
    /\bimport\b/i,
  ],

  'duplicate-action': [
    /\bdouble[ -]?submit\b/i,
    /\bduplicate\b/i,
    /\bidempotent\b/i,
  ],

  optimistic: [
    /\boptimistic\b/i,
    /\boptimistically\b/i,
  ],

  motion: [
    /\banimation\b/i,
    /\bmotion\b/i,
    /\btransition\b/i,
    /\bparallax\b/i,
  ],

  touch: [
    /\btouch\b/i,
    /\bmobile\b/i,
    /\btap\b/i,
  ],

  image: [
    /\bimage\b/i,
    /\bphoto\b/i,
    /\bavatar\b/i,
    /<img\b/i,
  ],

  icon: [
    /\bicon\b/i,
    /\bicon-only\b/i,
  ],

  timed: [
    /\btimeout\b/i,
    /\btime limit\b/i,
    /\bexpires in\b/i,
    /\bcountdown\b/i,
  ],

  settings: [
    /\bsettings\b/i,
    /\bpreferences\b/i,
  ],

  flow: [
    /\bflow\b/i,
    /\bjourney\b/i,
    /\bworkflow\b/i,
  ],
}
