export const SIGNAL_PATTERNS: Record<string, RegExp[]> = {
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
  ],

  search: [
    /\bsearch\b/i,
    /\bfilter\b/i,
    /\bquery\b/i,
  ],

  upload: [
    /\bupload\b/i,
    /\bfile input\b/i,
    /type=["']file["']/i,
  ],

  error: [
    /\berror\b/i,
    /\bfailure\b/i,
    /\bfailed\b/i,
    /\bcatch\b/i,
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

  flow: [
    /\bflow\b/i,
    /\bjourney\b/i,
    /\bworkflow\b/i,
  ],
}
