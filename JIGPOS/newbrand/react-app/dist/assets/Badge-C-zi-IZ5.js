import{j as i}from"./index-B-R9Sv7x.js";const e={active:"bg-jig-purple text-gray-100",pending:"bg-jig-amber text-white",approved:"bg-jig-purple text-gray-100",rejected:"bg-jig-red text-gray-100",processing:"bg-jig-amber text-white",completed:"bg-jig-purple-dark text-gray-100",paid:"bg-jig-purple-dark text-gray-100",redeemed:"bg-jig-purple-light text-gray-100",info:"bg-info text-white",warning:"bg-warning text-gray-900",error:"bg-error text-white",success:"bg-success text-white"};function p({status:t="info",children:r,className:g=""}){return i.jsx("span",{className:`
        inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide
        ${e[t]||e.info} ${g}
      `,children:r})}export{p as B};
