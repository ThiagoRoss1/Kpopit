// DevTools easter egg — once per browser session. The module-level guard blocks a
// double-fire within one load; sessionStorage blocks reprints across reloads in the
// same session. SPA navigation never re-imports, so no per-route reprint either.
const SESSION_KEY = 'kpopit_egg_shown';
let printed = false;

const ART = String.raw`
'..''...'..;oxdlc,......,;;,..;l;..                         .,cxl.............';
K0O00OOO00kolddlc,......;;;;,,;;,'..                         .cx;...............
Kxdx0KKKKKXOoddl:,.....';;;;,;;;,.                            ';..........  .   
Odccdkoollolcodl:;'....';;'..cl'....''''''....                .;' ...''         
xKk:lOkddxxlclo:....  ..;;,.',,:lok0OO0000OOk:.               .lxl,.;o;   ...   
,lolccccllllcco:.    ...;::;'.;O0O000000000X0;                 ,dl'.',....','''.
..',;;,,;::;;coc........,;:c..l000000KKKKKKXx.                 .'.........,,....
;;cllodddxxxxxxxdooolllccclc..cxOOOkkOOOkocd:                  .................
:::ccccllllllooooooooooddddc.':::;;;::cllccl'                 .,ccc:,'..........
;;;;;:::::::ccllloooooddxkk:.            ...                  .cdooolc:c:::::;;;
,,;;::::clllodxxxkkkkOOOOOx'  ..'',,,''......                 .,c::::;;;;;;;;,,;
ccllodooodddxxxxkkkkkkkkkkx,.;odxkOOOOOOOkkxol:,..            .;:::;;;;;,,,,,,,'
dddooooooooddxxkkkkkxxxxxxxl:ododkO000OOOkkOOOOkdl:,..       .,::;;;;;;,,,,,,,,'
oodddddxxxxxxxxkxxxxdddxxl;,:c;;ldk0K0OkxkkO0KK0OOkxl'..    ..;:::;;;;;;,,,,,,''
ccccccclooddxxkkkkkkkxocc:,:oc:l:,:oddolcll:cloddoolcclc,.  .';;;;;;;;;;;,,,,,,,
odxxddxxxxxxdddddllloolccc::odx00o,cc;lddxdodxo;,:cokO0kxl. ..........''',,,,,,,
:::;:cllodxkkOkkdlcccllclllcldk0XxcOO;,xKK0KKXXdo00xk0000k;....          ..,,,,,
000OkkxxdlcccccccccccllllllloxxkOxONNOcok0XXXXKdkXKkxO000k;.......      ....,;;,
dxkOKK0kdocccccccllllllllllldOKO0KXXXX0xdxOOOOkkKXKkkkO0KO:.........    ....,;;;
;;::ccc:ccccccllllllllllllolo0KOkO0000KKKKOOO0KXXKOO0O00K0l....'......   ...;:;;
;:::::ccccccccllllllloooooolo0X0kxxk000000000KK0Oxk0KKKKK0x;.....''...     .;;;;
::::cccccccllllllllooooooooodOXKOxddk0KKXXXXKOkdooOKKKKKK0kc.....'''....    .'..
::cccccccclllllooooooooooooodOXKOkxxdxkkkOOdccoddx0XKKK0KOdl,....'''....    .'..
cccccccllllllooooooooooooooodOXK0Okxdol;'co:;;lkk0XXXK0KKkdl;....''''....   .'..
ccccclllloooooooooooooooodddd0XK0OOkxdx:.:ol;;cx0KXXXKKKOxdo;...''''''...  .,;,'
ccclllloooooooooooodddddddddd0XXK0OOkkkl;:ddc;;d0XXXKKKKkdol,..''''''.... .,;::;
xxdddddooooooooodddddddddddddOXXK00OOkko;cxxl::xKKKKKKK0xol:,''''.........,::;;;
kkOOOOOOkkxxxddddddddddddddddkXXKK00Okko;ckko:cOKKKKKKKkl:;,'...........,:c:::;;
kkkkOOOO000000OOkkkkxxddddddx0XXKK00Oxxd:d0kolxKKKKKKKOl;;'''.....''',:cllc::::;
dxxxkkkOOO00000000KK00OOOOOxxKXKK00KOddxdk0xod0XKKK0KKxc:;,,,,,,,;::cloolc::::::
lllloddxxkkkOOOO00000000K0xdx0XK0K00OddOK0OdlxKXKKK0KOdllllccccccccloodoc:::::::
ooooollloddxxxkkkOOOO000Ol;cok0KKKK0Oxx0K0x::OXKKK000xoolllcccllooooddoc::::::::
xxkxxxddddoooooddxxxxkkkd;'coxO0O0K0Oxk000o:xKXKK000kl::::cccloddooodoc::::::::;
kkkxxxxxkkkkxxxddoooodddo:,codkOkkO0kxO0Oklo0KKK0O0Oo;;:c:cccllllllolc::::::::;;
KKK0OOOkkkkkkkkOOOkkxxdooc',lodxxxkOxk0OkdlxKKKKOkOxlccccccccccloolllcc:::::::;;
XXXXKKXKKK00OOOOOOO00OOkxdl;:oolloxOkkOkxdx0K0K0xdxoc:::cccloooddool:::ccc:::::;
KKK00KNNNNNXXKKK0OOOkkkkkkxdooollldddxkxdxO00Okdodolccloolccoxdolloc;;:::;,,;:::
llcccloxk0XXNNNNXXXXKOOkxxxxxdoolllloolodxOOkdooolccccoxddkdlc;:llllccccc:,',,,,
xdxxdooc:coOKNNNNXNNNNNXK0Okxxddol::cc:ldoddololc::ccclxxdocclc,:lllooolcc:;;,,,
oxkkkOOkxl;;o0XNXXXNNNNNNNXKK0Okdocccccclccc::c::cooddooocclclc;;cc:;::::clllc:;
ddddxxkOOOdc;l0XXXKXXXXXXNNNXXX0xolccc:::::cllllclxxdxdlccccccc:;cc:;;;;,,;,,,;;
dxkkooxkkkOkc,oKXKKKXXXNNXXXXXXKxlolcccccccldkOkxdolcccc:::ccccc::;,'',,,;,,'...
xxxxkkodOkkk:':OXXKKXXXXXXXXKKXKxlllccc::c:ccoddolccccccc:::::cc::;,,,'''',,'''.
lokkxxdoxxOOl';kXXK0KXXXXXKKKKKKkoccc:cccc:cc::;:cccc:cc::::::cc::;;;;,''......'
oloddxddkkkkc',xKKK00KKKXXKKKK0Okl:::::::::::;;,,:ccccccc:::c::cc:;;;,,,'''..   
xodOkkdoddxx:.;kKKKOOKKKKKK00Okkd'...;:;;;:::;;:;';:::::::cccccllc:;;,,,,,,,,,'.
lclodooxOOOd,.cO0000O0000OOOOOOOo.   .;;,,;:;...,,,;::::::cldkOOOxdoc:;;;;,,,:c:
:ldxkdoxxxxc.'o0000OkkOkkOOOOOOOo.    .',,;;.   .,,::::::ok0KKK00Okxdlcclc:::::;
ldxxdooxxxo'.:k0OOOkxxkOOOOOOOOOk;       ...      'xOxxxOKXXXKK00Okddlcloddddo:'
,;:lcoxxkx:.'oOkkkOOxxkkkOOkkkOOOl.              .lOOO000KKKKKK00Okdolc:codxkl..
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
    console.log('%cKpopIt — made with 💗 for K-pop stans. Think you found a bug? ping us.', 'color:#C62368;');
}
