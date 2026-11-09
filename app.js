const $ = s => document.querySelector(s);
const defaults = [
 {id:'cloud',name:'云朵无痕内衣',category:'无痕内衣',price:129,original:169,color:'#a8b79b',bg:'#e9ede1',tag:'当季推荐',description:'简洁无痕外观，柔和的鼠尾草绿，适合日常搭配。示例款式：实际面料、尺码与库存请以店铺确认为准。'},
 {id:'lace',name:'花间蕾丝内衣',category:'蕾丝内衣',price:159,original:199,color:'#cfafa3',bg:'#f1e7e1',tag:'人气精选',description:'温柔的豆沙色搭配花纹细节，为日常添一份精致。示例商品，请向店主确认尺码与面料。'},
 {id:'sport',name:'自在轻动运动内衣',category:'运动内衣',price:139,original:179,color:'#6f7b72',bg:'#e7eae5',tag:'轻运动',description:'宽肩带与简洁背心轮廓，适合轻松日常造型。示例商品，运动支撑等级需以实际产品说明为准。'},
 {id:'home',name:'晚安棉感家居套装',category:'家居服',price:229,original:299,color:'#d3bc99',bg:'#eee9df',tag:'秋冬新款',description:'奶茶色家居套装，让居家时光更自在。示例商品，请向店主确认实际成分、厚度与尺码。'}
];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let artCount=0;
function art(p){const color=/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#a8b79b';let shape='';
 if(p.category==='家居服')shape=`<path d="M107 72 160 54 201 76 242 54 293 72 330 176 286 193 273 151 280 285 122 285 128 151 114 193 70 176Z" fill="${color}"/><path d="m160 54 41 22-29 54-29-30Zm82 0-41 22 29 54 28-30Z" fill="#ffffff36"/><path d="M201 80V284M135 244H269" stroke="#89775a" opacity=".4"/><path d="M225 150h37v35h-37Z" fill="none" stroke="#89775a" opacity=".5"/><g fill="#f1ebdc"><circle cx="208" cy="150" r="3"/><circle cx="208" cy="191" r="3"/><circle cx="208" cy="232" r="3"/></g>`;
 else if(p.category==='运动内衣')shape=`<path d="M110 65h44l10 64q36 20 72 0l10-64h44l-3 86 39 86-25 54H99l-25-54 39-86Z" fill="${color}"/><path d="M154 65q45 75 92 0l-10 64q-36 25-72 0Z" fill="#ffffff20"/><path d="M92 252h217l-8 39H99Z" fill="#00000014"/><path d="M113 151q87 45 174 0" fill="none" stroke="#ffffff35" stroke-width="2"/>`;
 else shape=`<path d="M94 185 109 52q2-10 14-9l12 2-18 147M283 192 265 45l12-2q12-1 14 9l15 133" fill="none" stroke="${color}" stroke-width="13"/><path d="M63 191q52-11 137 12 85-23 137-12l-4 65q-133 43-266 0Z" fill="${color}"/><path d="M78 193q13-91 72-89 43 4 50 100-44 70-113 30Z" fill="url(#cloth)"/><path d="M322 193q-13-91-72-89-43 4-50 100 44 70 113 30Z" fill="url(#cloth)"/><path d="M82 224q55 45 116-20m4 0q61 65 116 20" fill="none" stroke="#ffffff48" stroke-width="2"/><path d="M70 255q130 32 260 0" fill="none" stroke="#00000014" stroke-width="2"/><path d="m194 206 7-8 7 8-7 6Z" fill="#ece2ca"/>${p.category==='蕾丝内衣'?'<path d="M94 174q14-34 28 0t28 0t28 0M223 174q14-34 28 0t28 0t28 0M95 201q14-30 28 0t28 0t28 0M221 201q14-30 28 0t28 0t28 0" fill="none" stroke="#ffffff55" stroke-width="2"/>':''}`;
 return `<svg viewBox="0 0 400 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(p.name)}款式示意插画"><defs><linearGradient id="cloth" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ffffff" stop-opacity=".36"/><stop offset=".45" stop-color="${color}"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><g stroke-linejoin="round">${shape}</g></svg>`.replaceAll('cloth', 'cloth-'+(artCount++));
}

