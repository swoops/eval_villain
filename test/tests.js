// switcheroo won't log, instead it will push console args to allCalls where we
// can test them

// ensure functions hooked message is displayed
{
	if (allCalls.length != 1) {
		fail("Only Banner");
	}
	/* printNextArgs(); */
	chckNArg(["%c[EV]%c Functions hooked for %c%s%c", colGreen, colRed, colGreen, location.origin, colRed], "banner check");
}

/*
 * NOT interesting stuff
*/
var t = "innerHTML no interest"
var value = 'z980j4kd0';
document.getElementById('here').innerHTML = value;
testNormal(t, "set(Element.innerHTML)", value);

t = "outerHTML no interest"
document.getElementById('here').outerHTML = value;
testNormal(t, "set(Element.outerHTML)", value);

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
let reason = "needle";
let needle = 'asdf';
let decoded = "";
t = "Eval needle"
let line = ['{let ', needle, ' = true}'];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line);

t = "Blacklist true, needle eval"
reason = "needle";
needle = 'asdf';
line = ['', needle, ' = 1;{let ', needle, ' = true}'];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line);

t = "Query unencoded"
reason = "query[param_zxcv]";
needle = 'zxcv';
line = ['// ', needle, ''];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line, false);

t = "Query encoded"
reason = "query[encoded]";
needle = '\' + <';
line = ['// ', needle, ''];
decoded = 'decodeURIComponent("%27%20%2b%20%3c")';
eval(line.join(""));
testInterset(t, "eval", reason, needle, line, decoded);

t = "Fragment"
reason = "fragment";
needle = 'fragment_value';
line = ['// ', needle, ''];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line);

t = "2nd Fragment"
needle = "newfrag";
window.location.hash = needle;
reason = "fragment";
line = ['// ', needle, ''];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line);

t = "new fragment blacklist"
needle = "true";
window.location.hash = needle;
reason = "fragment";
line = ['// ', needle, ''];
eval(line.join(""));
testNormal(t, "eval", line.join(""));

t = "decoding atob,json,array  atob encoded"
reason = "query[json]";
needle = 'secondinarray';
decoded = 'JSON.parse(atob("eyJmaXJzdFByb3BlcnR5IjoiZmlyc3RQcm9wYW5zIiwic2Vjb25kQXJyYXkiOlsiZmlyc3RpbmFycmF5Iiwic2Vjb25kaW5hcnJheSJdLCJib29sIjp0cnVlLCJzbWFsbCI6ImEifQ=="))["secondArray"]["1"]';
line = ['// ', needle, ''];
eval(line.join(""));
testInterset(t, "eval", reason, needle, line, decoded);
