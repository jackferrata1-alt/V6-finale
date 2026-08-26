// Racing Engineer V6 track database.
// Track names are based on the F1 24 / F1 25 + 2026 Season Pack track set.
// Map geometry is an original interactive schematic; it is not official EA map artwork.

const TRACKS = [
{id:"bahrain",name:"Bahrain",laps:57,turns:["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","T13","T14","T15"],shape:"bahrain"},
{id:"jeddah",name:"Jeddah",laps:50,turns:Array.from({length:27},(_,i)=>`T${i+1}`),shape:"jeddah"},
{id:"australia",name:"Australia",laps:58,turns:Array.from({length:14},(_,i)=>`T${i+1}`),shape:"australia"},
{id:"japan",name:"Japan — Suzuka",laps:53,turns:Array.from({length:18},(_,i)=>`T${i+1}`),shape:"suzuka"},
{id:"china",name:"China",laps:56,turns:Array.from({length:14},(_,i)=>`T${i+1}`),shape:"china"},
{id:"miami",name:"Miami",laps:57,turns:Array.from({length:19},(_,i)=>`T${i+1}`),shape:"miami"},
{id:"imola",name:"Imola",laps:63,turns:Array.from({length:19},(_,i)=>`T${i+1}`),shape:"imola"},
{id:"monaco",name:"Monaco",laps:78,turns:Array.from({length:19},(_,i)=>`T${i+1}`),shape:"monaco"},
{id:"canada",name:"Canada — Montréal",laps:70,turns:Array.from({length:14},(_,i)=>`T${i+1}`),shape:"canada"},
{id:"spain",name:"Spain — Barcelona",laps:66,turns:Array.from({length:14},(_,i)=>`T${i+1}`),shape:"spain"},
{id:"austria",name:"Austria — Red Bull Ring",laps:71,turns:Array.from({length:10},(_,i)=>`T${i+1}`),shape:"austria"},
{id:"silverstone",name:"Great Britain — Silverstone",laps:52,turns:Array.from({length:18},(_,i)=>`T${i+1}`),shape:"silverstone"},
{id:"hungary",name:"Hungary",laps:70,turns:Array.from({length:14},(_,i)=>`T${i+1}`),shape:"hungary"},
{id:"spa",name:"Belgium — Spa-Francorchamps",laps:44,turns:Array.from({length:19},(_,i)=>`T${i+1}`),shape:"spa"},
{id:"zandvoort",name:"Netherlands — Zandvoort",laps:72,turns:Array.from({length:14},(_,i)=>`T${i+1}`),shape:"zandvoort"},
{id:"monza",name:"Italy — Monza",laps:53,turns:Array.from({length:11},(_,i)=>`T${i+1}`),shape:"monza"},
{id:"baku",name:"Azerbaijan — Baku",laps:51,turns:Array.from({length:20},(_,i)=>`T${i+1}`),shape:"baku"},
{id:"singapore",name:"Singapore",laps:62,turns:Array.from({length:19},(_,i)=>`T${i+1}`),shape:"singapore"},
{id:"cota",name:"USA — COTA",laps:56,turns:Array.from({length:20},(_,i)=>`T${i+1}`),shape:"cota"},
{id:"mexico",name:"Mexico",laps:71,turns:Array.from({length:17},(_,i)=>`T${i+1}`),shape:"mexico"},
{id:"brazil",name:"Brazil — Interlagos",laps:71,turns:Array.from({length:15},(_,i)=>`T${i+1}`),shape:"brazil"},
{id:"lasvegas",name:"Las Vegas",laps:50,turns:Array.from({length:17},(_,i)=>`T${i+1}`),shape:"lasvegas"},
{id:"qatar",name:"Qatar — Lusail",laps:57,turns:Array.from({length:16},(_,i)=>`T${i+1}`),shape:"qatar"},
{id:"abudhabi",name:"Abu Dhabi — Yas Marina",laps:58,turns:Array.from({length:16},(_,i)=>`T${i+1}`),shape:"abudhabi"},
{id:"portugal",name:"Portugal — Portimão",laps:66,turns:Array.from({length:15},(_,i)=>`T${i+1}`),shape:"portugal"},
{id:"madrid",name:"Spain — MADRING (2026)",laps:57,turns:Array.from({length:22},(_,i)=>`T${i+1}`),shape:"madrid"},
{id:"silverstone-reverse",name:"Silverstone — Reverse",laps:52,turns:Array.from({length:18},(_,i)=>`T${i+1}`),shape:"silverstone"},
{id:"austria-reverse",name:"Austria — Reverse",laps:71,turns:Array.from({length:10},(_,i)=>`T${i+1}`),shape:"austria"},
{id:"zandvoort-reverse",name:"Zandvoort — Reverse",laps:72,turns:Array.from({length:14},(_,i)=>`T${i+1}`),shape:"zandvoort"}
];

// Original normalized schematic shapes. They provide a real circuit-like
// visual and clickable corner positions without copying licensed map artwork.
const SHAPES = {
bahrain:[[10,62],[18,52],[15,38],[25,28],[42,25],[54,33],[50,48],[66,50],[83,42],[90,28],[76,20],[60,18],[67,8],[87,9],[94,22],[91,61],[75,74],[55,78],[38,72],[25,82],[10,78]],
jeddah:[[8,55],[14,30],[35,16],[61,13],[87,23],[93,39],[82,45],[95,57],[88,72],[67,81],[47,72],[54,59],[32,63],[17,80],[8,68]],
australia:[[12,65],[10,35],[27,20],[50,15],[76,22],[90,38],[81,50],[91,66],[78,79],[54,84],[35,75],[26,60],[39,48],[58,50],[64,64],[48,68],[31,57],[20,72]],
suzuka:[[8,65],[18,49],[13,31],[25,19],[44,18],[58,29],[62,44],[52,54],[64,62],[80,59],[91,45],[86,30],[72,24],[65,35],[73,48],[86,55],[94,70],[75,82],[51,80],[36,68],[22,78]],
china:[[8,60],[16,34],[35,18],[58,16],[78,24],[91,39],[84,51],[67,56],[80,68],[70,79],[47,83],[25,77],[14,65],[32,60],[50,61],[61,72],[47,74],[31,66],[18,73],[8,60]],
miami:[[8,70],[18,35],[36,16],[68,13],[89,29],[81,42],[93,55],[82,75],[56,83],[37,72],[50,57],[68,58],[74,70],[58,72],[44,60],[29,63],[20,79]],
imola:[[10,65],[18,43],[12,24],[31,17],[52,19],[64,30],[58,43],[73,47],[88,36],[91,54],[78,70],[59,77],[43,69],[34,55],[47,50],[57,60],[45,68],[28,78],[10,65]],
monaco:[[8,70],[17,54],[12,36],[25,23],[47,18],[67,25],[83,20],[94,30],[87,43],[70,45],[74,59],[91,64],[82,77],[61,79],[51,67],[39,75],[25,72],[18,61],[8,70]],
canada:[[8,68],[12,32],[31,18],[57,19],[85,27],[92,42],[80,51],[92,63],[81,77],[56,82],[32,73],[21,57],[37,51],[54,58],[66,70],[48,73],[29,62],[8,68]],
spain:[[8,65],[13,34],[30,18],[55,17],[78,26],[92,41],[84,55],[92,68],[78,80],[56,82],[38,70],[28,55],[43,48],[61,51],[72,63],[58,70],[40,61],[24,74],[8,65]],
austria:[[8,65],[16,43],[14,22],[30,14],[53,17],[75,27],[91,43],[85,55],[70,58],[78,72],[62,82],[43,76],[33,61],[45,51],[62,48],[72,59],[55,65],[34,58],[22,73],[8,65]],
silverstone:[[8,66],[13,44],[28,27],[47,19],[68,23],[87,36],[91,53],[79,68],[63,78],[45,74],[33,62],[43,50],[60,45],[72,52],[66,63],[51,60],[36,49],[23,58],[8,66]],
hungary:[[8,67],[15,43],[31,23],[54,17],[77,24],[91,39],[85,52],[91,66],[77,79],[55,84],[35,76],[25,62],[40,55],[56,60],[66,72],[51,73],[33,63],[19,77],[8,67]],
spa:[[8,73],[13,48],[24,31],[42,20],[59,23],[71,36],[67,49],[82,51],[92,41],[86,60],[72,73],[56,82],[39,77],[31,62],[44,55],[58,64],[52,76],[32,83],[8,73]],
zandvoort:[[8,66],[14,39],[30,21],[52,16],[73,22],[88,35],[92,51],[82,63],[90,76],[70,83],[49,77],[37,66],[45,54],[62,51],[72,60],[61,70],[43,72],[26,80],[8,66]],
monza:[[8,72],[14,35],[31,17],[55,15],[77,24],[91,40],[84,52],[93,64],[79,77],[57,80],[40,68],[52,55],[69,56],[77,67],[62,72],[43,61],[27,73],[8,72]],
baku:[[8,76],[12,51],[20,22],[39,13],[61,18],[78,29],[90,43],[82,53],[91,63],[84,77],[65,83],[47,76],[35,62],[47,55],[63,56],[74,68],[57,74],[38,66],[21,81],[8,76]],
singapore:[[8,69],[11,39],[25,21],[50,15],[73,19],[89,32],[92,50],[83,62],[91,76],[70,83],[50,75],[38,62],[48,51],[64,54],[73,67],[58,72],[39,67],[24,79],[8,69]],
cota:[[8,72],[17,48],[14,24],[30,13],[48,19],[54,36],[47,48],[62,46],[79,31],[91,35],[85,53],[93,68],[78,80],[58,76],[43,65],[50,54],[65,58],[72,72],[54,83],[31,78],[8,72]],
mexico:[[8,68],[13,42],[27,22],[49,15],[71,20],[89,35],[86,50],[92,65],[78,80],[57,82],[40,72],[31,58],[44,52],[60,56],[68,69],[53,73],[36,63],[22,78],[8,68]],
brazil:[[8,70],[13,46],[28,27],[50,17],[72,23],[89,39],[85,53],[92,67],[76,80],[57,78],[47,65],[61,54],[74,62],[64,72],[45,68],[30,55],[18,73],[8,70]],
lasvegas:[[8,72],[11,45],[25,20],[48,15],[74,19],[91,32],[85,48],[94,60],[86,75],[67,83],[46,79],[36,65],[49,55],[68,58],[76,71],[59,76],[40,68],[22,80],[8,72]],
qatar:[[8,68],[13,39],[28,21],[52,15],[76,23],[91,39],[87,55],[93,70],[77,82],[57,79],[42,68],[49,55],[65,51],[77,62],[66,72],[47,73],[29,80],[8,68]],
abudhabi:[[8,67],[15,42],[31,20],[54,14],[77,21],[91,35],[87,49],[93,64],[82,78],[61,82],[44,72],[34,58],[47,51],[62,55],[72,68],[58,74],[40,63],[25,78],[8,67]],
portugal:[[8,70],[13,44],[28,22],[50,14],[72,21],[90,37],[86,52],[93,67],[79,80],[58,82],[39,71],[30,56],[45,49],[62,54],[69,68],[54,74],[36,64],[20,79],[8,70]],
madrid:[[8,68],[12,43],[24,25],[45,16],[67,18],[85,29],[92,43],[82,54],[93,66],[83,78],[61,82],[43,73],[50,59],[67,58],[77,69],[63,76],[44,67],[31,76],[18,62],[31,52],[48,49],[58,37],[43,31],[27,38],[18,53],[8,68]]
};
