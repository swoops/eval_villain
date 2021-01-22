# Eval Villain

This is a web extension for Firefox that will hook dangerous functions, like
eval, and warn you of their use.

![EV Console Screen Capture](./ss.png?raw=true)

## Why

JavaScript is commonly Minified, compiled and or obfuscated. It is also bloated
with worthless code (re-implement `atob` for IE<10). This tools lets me focus
on the important things and ensures I don't miss the easy things.

## Video
Here are links to video segments walking through all this stuff.

* Video intro: [here](https://vimeo.com/365789766)
* What is DOM XSS (skip rant): [here](https://vimeo.com/365789766#t=1:36)
* Just show me Eval Villain (skip DOM XSS explained): [here](https://vimeo.com/365789766#t=3:55)
* Skip to needle example (search JS input with regex): [here](https://vimeo.com/365789766#t=5:28)

HTML used in video is found [here](https://github.com/swoops/ev_slides)

## adding it to firefox

* Go here [here](https://addons.mozilla.org/en-US/firefox/addon/eval-villain/)
* click "Add to Firefox"

## Normal use
Turn it on, open the console `ctrl+shift+k` and browse some sites like normal.
Eval Villain will inject it's own henchmen into the page to keep an eye on some
of the more nefarious JavaScript functions. When one of those functions is
called, a notification will appear in the console. If it is of particular
interest it will be highlighted and formatted more strongly.

Check out the video above to see it being used. I would start
[here](https://vimeo.com/365789766#t=3:55).

## Some Terminology
You can probably skip this, if you don't understand how I use a term later,
come back.
* EV: short for Eval Villain
* Hooked Input: EV hooks native JavaScript functions in order to see what input
  is being passed to them. I will refer to this input as hooked input.
* Normal Result: Hooked Input is examined for potential user input. If no
  potential user input is found then the notification produced will be a normal
  result.
* Interesting Result: Output from EV that is considered of higher priority.
* popup: The popup is the menu that appears when you click the EV icon.
* Configuration page: This is the page where the bulk of the configuration can
  be done. It can be reached by clicking "configure" in the popup menu, or in
  the options page.


## Configuration Options
**Important**: You must refresh the web page you are testing after every single
configuration change for that change to take affect.

EV works by injecting a script into the page *at load time*. To limit the
potential for a visited site to attack EV, EV does not have any further
communication with the page after it is injected.

### popup Options
Most of the popup menu just lets you turn some option on or off. EV itself can
be enabled or disabled here. This should be pretty self explanatory. The only
things unique to this menu are the "Enable/Disable" and "Auto Open" menus.
Everything else can also be configured from the configuration page. You can get
to the configuration page by clicking "configure" in the popup menu.

### Needles
EV will search hooked input for each configured needle pattern. If the needle
is found EV will consider that function call an interesting result and a Needle
section will be added to the output. The needle section will highlight the
pattern where it is found in the input.

The needle pattern can be set to a Regular Expression, see RegEx for more
details.

### Blacklists
Eval Villain checks if strings seen in sources are found in sinks. If a source
string is found in a sink, the result is marked as interesting. It can be
annoying to have common strings, like "true", marked as interesting. So
configuring a blacklist will allow you to ignore these strings.

Tips:
* Dev out your blacklist pattern as a Needle first to make sure you are
  matching only what you want.
* Use regex and match from the start to end `/^pattern$/` to ensure you do not
  not match on a string like `this contains pattern in it`.

### Regex
A regular expression can be used as a pattern for Needles and Blacklists. A
regular expression should always start with a "/" and end with a "/",
potentially followed by the "g" and "i" flags. On the configuration page, any
pattern considered by EV to be a regular expression will receive a brighter
color for it's font.

Internally EV uses JavaScript's RegEx implementation.

Tips:
* Dev RegEx in the console:
```
a = /^\s*pattern$/gi;
a.test("Some pattern I found often"); // test false
a.test("   pAtTerN"); // true
```

### Targets
Targets limit what pages are injected by EV. If no targets are enabled then
EV will inject every page. Target patterns can contain wild cards, for example
`*://example.com/*`. All the details can be found in the [Firefox
documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns)

### functions
These are the functions that are being hooked. Configure new ones by putting in
a nice descriptive name and a pattern that will resolve to the function. For a
setter, like `innerHTML` use `setter(innerHTML)`. If no functions are enabled
then Eval Villain won't be doing much, even if it is on. Since EV injects the
page before any JavaScript in the page has loaded, only native JavaScript
functions can be configured.

### Enable/Disable (popup only)
An entire feature can be disabled via this menu. One might disable "Query
Search" if it is producing too many false positives.

Tip:
* Disable "Normal Results" and enable "Interesting Results" to cut down on
  spam.

### Auto Open (popup only)
In the popup menu the "Auto Open" section allows you to change how much
information is visible by default for each result. Enabling an auto open means
the console group that contains the information will automatically be open.

Tip:
* When working on developing a payload, auto open "Interesting Result" and
  "Needles" and configure a Needle to match your payload. You can then quickly
  see if your payload is getting filtered.
* Stack should almost never be enabled here, it can be very large and you
  likely don't need to see it for every single result.

### Console Colors
Console output is split up into various sections. Each section has a
highlighting format and a default format. Default is used for most the text
while highlight is used to highlight key words. The "Console Colors" section of
the configuration page allows you to configure arbitrary CSS for each format.

Before saving your changes be sure to test your configuration to see if it
looks good. Open the console and click the "test" button in the configuration
page. If you like the console output then click save to keep it.

## Todo:
* Update interesting results title with the reasons it is interesting
* Prohibit hooking of functions used in hooking code to avoid infinite
  recursion.
* If the config page is already open, go to that page instead of a new tab (may
  require permissions...)
