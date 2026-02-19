import{j as t}from"./index-B-R9Sv7x.js";function b({tabs:o=[],activeTab:a,onChange:n,className:s=""}){return t.jsx("div",{className:`flex gap-1 border-b-2 border-gray-200 overflow-x-auto ${s}`,children:o.map(e=>{const r=e.key||e,i=e.label||e,l=a===r;return t.jsx("button",{onClick:()=>n(r),className:`
              px-5 py-3 text-sm font-semibold uppercase tracking-wider whitespace-nowrap
              transition-all duration-300 border-b-3 -mb-[2px] font-body
              ${l?"border-jig-amber text-white":"border-transparent text-gray-500 hover:text-jig-purple hover:border-jig-amber/40"}
            `,children:i},r)})})}export{b as T};
