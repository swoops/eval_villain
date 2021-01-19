// switcheroo won't log, instead it will push console args to allCalls where we
// can test them

// ensure functions hooked message is displayed
{
	if (allCalls.length != 1) {
		fail("Only Banner");
	}
	/* printNextArgs(); */
	chckNArg(["%c[EV]%c Functions hooked for %c%s%c", colGreen, colRed, colGreen,"",colRed], "banner check");
}

/*
 * NOT interesting stuff
*/
var t = "innerHTML no interest"
var value = 'z980j4kd0';
document.getElementById('here').innerHTML = value;
testNormal(t, "innerHTML", value);

t = "outerHTML no interest"
document.getElementById('here').outerHTML = value;
testNormal(t, "outerHTML", value);

t = "document.write no interest"
document.write(value);
testNormal(t, "document.write", value);

t = "Eval no interest"
value = '{let dk309slkz9 = 939202}';
eval(value);
testNormal(t, "eval", value);

t = "Eval blacklist bool"
value = '{let dk309slkz9 = true}';
eval(value);
testNormal(t, "eval", value);

/*
 * Interesting
*/
var reason = "needle";
var needle = 'asdf';
t = "Eval needle"
var line = ['{let ', needle, ' = true}'];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line);

t = "Blacklist true, needle eval"
var reason = "needle";
var needle = 'asdf';
var line = ['', needle, ' = 1;{let ', needle, ' = true}'];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line);

t = "Query unencoded"
var reason = "query[param_zxcv]";
var needle = 'zxcv';
var line = ['// ', needle, ''];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line, false);

t = "Query encoded"
var reason = "query[encoded]";
var needle = '\' + <';
var line = ['// ', needle, ''];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line, true);

t = "Fragment"
var reason = "fragment";
var needle = 'fragment_value';
var line = ['// ', needle, ''];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line, false);

t = "2nd Fragment"
needle = "newfrag";
window.location.hash = needle;
var reason = "fragment";
var line = ['// ', needle, ''];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line, false);

t = "new fragment blacklist"
needle = "true";
window.location.hash = needle;
var reason = "fragment";
var line = ['// ', needle, ''];
eval(line.join(""));
testNormal(t, "eval", line.join(""));
