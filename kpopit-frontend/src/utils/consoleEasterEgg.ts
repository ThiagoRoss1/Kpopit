// DevTools easter egg
const SESSION_KEY = 'kpopit_egg_shown';
let printed = false;

const ART = String.raw`
,;;,,;,,,,,,,,,,;,,,,,;;;;;;:cc:clllllldxOXNXKXNXx;''';:;,'':dddxxc'',;,,;;;cx0O
,,,,,,,,,,,,,,,,;;;;;;;;;;;;;;;;;::cllloodkOKXXKKk:'''','''',:oddxd:'';:;;cdkOko
,,,,,,,,,,,,,'',,,,,;;;;;;;;,,,,;;;;;::cloddxOOOOkc'''::,''''';lddxxl;,;loolccc:
'',,,,,,,,,,,,,,,,,'''',,,,,,,,,,,,,,;;;;;:lddoodko,,::,''''''',coddxxdol:;,,;;;
,,'',,'',,,,,,,,,,',,'''''''',,,,,,,,,,,,,,;:looccl:,;;,''''''''';:cclooooollc:c
,,,,,'',,,,,,,,,,,,,'''','''''''''',,,,,,,;,,;cc:,,:ll:,''''''''''''',,,,;::cllo
,,,,,,,,,,,,,,,,,''',,,''''''''''''''',,,,,,;,,;;,,,cdl,'''''''''''''''''''',;:;
''',,,,,,,,,,,,,,,''''''''''''''''''''''',,,,,,,,;,,:lc,'''''''''''''''''''''',,
,,,,,,,,,,,,,,,,''',,''''''''''''''''''''''',,,,,,,,,,,,''''.';c;'''''''''''''''
,,,,,,,,,,,,,,,,,,,''''''''''''''''''''''''''',,,,,,,,:lolccclkOxc,'''''''''''''
,,,,,,,,,,'',,,,,,,,,,,,,,,,,,,,,,,,''''''''''',,,,,'';:lodoooodddc,''''''''''''
,,,,,,,,,,,,,''''''''''''',,,,,,,,,'''''''''''''',,,,'',;:lodoc:::::;,''''''''''
,,,,,,,,,,,,,''',''''''''''''''''''''''''''''''''',,,''',,;lodoc::::c:;,''''''''
,,,,,,,,,,,''''',,,'',,,','''''''''''''''''''''''',,,,'''',;cllc::cccc::;,''''''
;,,,,,,,''''',,,,,,,,,,,,,,,,,,'''''''''''''''''''',,''''',,,;lolllcccc::;,'''''
;:::;;,,'''''',,,,;,,,''',,;;;;;;;;,,''''''''''''''',,'',,,;;;;:cllcccc::;''''''
,,,;::;,,,,;,,,'''',,,,,,,;cllooooolc;,''''''''''''',,''''',,;;::::ccccc;,''''''
;;;;,,,,,,;:::;,,'';clc;;cloddxxxxxxdoc;,''''''''''',,'''''',,,;;;;:ccc:,,,'''''
c:::;,,,,;;;;;;''''';cc;coodxxxxkkxxxddlc:,''''''''',,'''''',,,,,,,,;:;,,,'';cod
cc::;;;;;:::::,''''',;:coodxxxxxkkxxxxxddoc,'''''''',,'''''',,,,,,,',;;;:cloxKXX
;;;;;;::ccccc:,,::;,;:lodddxxxxxxxxxxxxxxxoc,''''''',,''''''',,,;;:lloxkkkkkOKXX
:;;;;::::cclol:,;::clooddxxxxxxkkkxxxxxxxxxdc,''''''','''''''',;:cloooxkkkkkk0XX
:::::::::clooddollodddxxxkkkkkkkkkkkkkxkkkxxd:'''''''''''''''','''',;:coxxkkkOKX
ccclllooooooodxxxxxxxkkkkkkkkkkkkkkkkkkkkkkxxl,'''''''''''''''',''''',;coxkkkk0X
llllloodxdddoodddxxxxkkkkkkkkkkkkkkkkkkkkkkkxdc;,'''''''''''''',,,,,;;,;lxkkxdx0
cccllodxxxxxdddxxxxxxxxxkkkkkkkkkkkkkkkkkkkkkdlc;;,''''''''''',,,,;;;;;;cdkxxddx
cllloodddxxkkxxxxxxxxxxxxxxxxxkkkOOkkkkkkOOkkdollc:;,,,''''''',,,,',,,;::oxxdddo
cllooodddddxxkkxxxxxxxxdddddoddxkkkkkkkkkkkkxdoooolc:;;,,,,,,',,,,,,,;:cccdxxxxx
;;;::cdxxddxxxxxkkxxxxdddddxkxdxkkkkkkkkkkkkxdddddolccc:;;,,,,,,,,,;;::cccoxxkkk
,'',;coxxxxxxxxxxxxxxxxxxxxkkxdxkkkkkkxxxxxxxdddxxddolllcc:;,,,,;;;::::clllodkOO
::;;lodxkkkkkxxxxxxxxkxxxxxdodxkkkkkkxooddxxxxdxxxxddoolllc:;;;:cclllllloodddxkk
cccodddxkkkkkkkxxxxkOOOkxxxddkkkxxxxdllodxxkxxxkkkxxdoolllccccclodddddooddddxkkk
loddxxxkkkkkkkkkxxxkkkkkxxddxxdddddlclldxxkkxxkkkkkxxdllllclolclddxxxxdddxxxxxkx
ldxxxkkkkkkkkkkkkkkkkxxxxxkxddddolcclloxkkkkxkkkkkkxddolollooolloxxxxxxxxxxxxxxx
';codxkkkkkkkkkkkkkkkkkOOOOkxdolccllooxkkkxxxkkkkkkxxdddddddddoloxxxxxxxxxxkkxxk
'''',;cloddxkkkkkOOOOOOOOOkdollllloddkkkxxdoddxkkkkkkxxxxxxxxxxooxkkkkkkkkkkkkkk
,''',''',,,;::cclodddxxxxxdoddddddooolloollloodxxxkkkkxxxxxkkkkxodkkkkkkkkkkkkkO
,,''',,'',,,''''',;;;;;;;;;oOOxdooc;,,;loooooodddxxxxkxxkxxkkkkxooxkkkkkOOOOOOOO
,''''',,,'',,,,,,;::::;,,,;cokxxxxoccloooooxxxdddxxxxxxxkxxxkkkxooxkkkkkOOOOOOOO
'''''''',,''',,,,,clcc;;cl::looxOOxloxkkkxdodxxddxxxkkxkkkxxkkkkdoxkkkkkkOOOOOOO
''''''''',,'',,';coo:,,ckOkolxdoxOkookkkkkkxxddoodxxkkkkkxxxxkkkdoxkkkkkkOOOOOOO
''''''''''''',coOOkd;;coxkkkddkxoxxdxkOOOkkkkkxdolldxxdxkxxxxxkkdoxkkkkkOOOOOOOO
''''''''''',:dO0KKKk:;lxxdddxxxkkkddkOOOOOOkkkkkkdolloddxkkxxkkxookkkkkOOOOOOOOO
''''''''';ldxO0000OkdcokOOkxxxxxk0OdxOOOOOOOkkkkkkxxdddoddxxxkkxoxkOOOOOOOOOOOOO
;:looll;;ldkOOkoldxxxxkkOOOOOkkxxKXOdkOOOOOOOOOkkkkkkkkxxdddddoloxkOOOOOOOOOOOOO
coxkkkkc;:odkkooc;,:oxxOOOOOOOOkk0XKOkkOOOOOOOOOOOkkkkkkkkkkkkxxoclokkkkkOOOOOOk
;::looolcclloccoc,';oxOXK0OkkkkkkO0KK0kkOOOOOOOOOOOOOOOOOOkkkkOkxoclxkkxkkkkkkkO
lloddc;oxc;,,,,,,,',lkKXXK0xdxxkkkkO0K0xxxkOOOOOOOOOOOOOOOOOOOkkkxxddooooodxk0KX
xxdo:,cddc,',,,,,,,:kXXK0kddolodxkkkO0KOkxxkOOOOOOOOOOOOOOOOOkkkxdollc::ldkKXXXX
oc;,',oxl;'''',''';kXXX0xdxdlllloddxOkO0K0xdxOOOOOOOOOOOOOOkkkxdoodkdlox0XXXXXXX
,''''';;,',,,,,,'';xKX0xoxOklclcc:;l0kodxkOkxxkOOOOOOOOOOkkkxxxxkOKKK0XXXXXXXXXX
'''''''''',,,''',,';oxdoclll;,;::,',:;',,;coxOOOOOOkkkkkOOOO00KKXKKKKXXXXXXXXKKX
'''''''''''''''''''',,;::;,,,,'''''''''''''';coxO0K00KKKKXXXXXXXXXXKKXXXXXKKKKXX
'''''''''''''''''',''',cooc::;'''''''''''''',,,;lkKXXXXXXXXXXXXXXXXKKXXXXXKXXXKK

`;

export function printEasterEgg(): void {
    if (printed) return;
    printed = true;
    try {
        if (sessionStorage.getItem(SESSION_KEY)) return;
        sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
        // Private mode / disabled storage: fall back to once-per-load (module guard).
    }
    // One styled call keeps the console clean.
    console.log(`%c${ART}`, 'color:#FF3399; font-family:monospace; font-weight:bold;');
    // Consoles don't render HTML — a full https: URL is what DevTools auto-linkifies,
    // so relative paths like "/contact" have to be spelled out with the domain.
    console.log(
        '%cKpopIt — made with 💗 for K-pop fans. Think you found a bug? Contact me -> \n%chttps://kpopit.net/contact %c· %chttps://x.com/TgoRoss1',
        'color:#C62368;',
        'color:#FF3399; font-weight:bold;',
        'color:#C62368;',
        'color:#FF3399; font-weight:bold;'
    );
}
