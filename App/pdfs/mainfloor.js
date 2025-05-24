const express = require('express');
const app = express();
const port = 3000;

// Import the sampleData and generateHTML function from generate-jump-pdf.js
const fs = require('fs');
const path = require('path');

// Function to convert image to base64
function imageToBase64(imagePath) {
  try {
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const imageExt = path.extname(imagePath).toLowerCase();
      let mimeType = 'image/png';
      
      if (imageExt === '.jpg' || imageExt === '.jpeg') {
        mimeType = 'image/jpeg';
      } else if (imageExt === '.png') {
        mimeType = 'image/png';
      } else if (imageExt === '.gif') {
        mimeType = 'image/gif';
      } else if (imageExt === '.webp') {
        mimeType = 'image/webp';
      }
      
      return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    }
    return null;
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
}

// Load the jump image (put your image file in the same folder)
const jumpImagePath = path.join(__dirname, 'Jump.png');
const jumpImageBase64 = imageToBase64(jumpImagePath);

// Real sample data - using your actual data structure
const sampleData = [
  {
    "a": 0, 
    "b": 0, 
    "bib": 123, 
    "c": 0, 
    "competenceId": 5, 
    "cv": 8.2, 
    "d": 0, 
    "d3": 0, 
    "delt": 0.6, 
    "dv": 0, 
    "e": 3, 
    "e2": 0, 
    "e3": 0, 
    "eg": 0, 
    "event": "FX", 
    "f": 0, 
    "g": 5, 
    "h": 0, 
    "i": 0, 
    "id": 196, 
    "j": 0, 
    "name": "LUIS1", 
    "nd": 5.3, 
    "noc": "Usa", 
    "number": 1, 
    "percentage": 50, 
    "rateGeneral": {
      "comments": "Comment 1 nodjndkdndkdj", 
      "compD": 5.2, 
      "compE": 8.555, 
      "compNd": 4.2, 
      "compScore": 9.654999999999998, 
      "compSd": 0.1, 
      "ded": 1.4450000000000003, 
      "difficultyValues": 5, 
      "eScore": 8, 
      "elementGroups1": 0.3, 
      "elementGroups2": 0.5, 
      "elementGroups3": 0.5, 
      "elementGroups4": 0.3, 
      "elementGroups5": 1.6, 
      "execution": 2, 
      "id": 110, 
      "myScore": 17.599999999999998, 
      "numberOfElements": 8, 
      "paths": "[{\"path\":\"M368.5 215.5 L400.5 224.5 L417.5 235 L432 245 L441.5 250.5 L446.5 251.5 L449.5 248.5 L453.5 241 L459 236.5 L469 237 L481.5 241.5 L494.5 241.5 L506.5 232 L515.5 215.5 L523.5 201.5 L528.5 194.5 L528.5 193\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M545 169.5 L563.5 199.5 L572.5 208 L578.5 210.5 L584 211 L591 209.5 L600 206.5 L610 205 L621 205 L631.5 208.5 L638.5 212 L641.5 213 L641 212\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M620 143.5 L639.5 216.5 L648 226 L659.5 236 L672 243 L685.5 245 L698.5 238 L706.5 223 L707.5 204 L700 183 L687 170.5 L667.5 171.5 L646 185 L632 201 L628.5 213.5 L631 218\",\"color\":\"red\",\"strokeWidth\":2,\"isEraser\":false,\"penType\":1},{\"path\":\"M856.5 222 L837.5 311.5 L848 330 L862 343 L879.5 352.5 L897.5 356.5 L914 355.5 L929 346 L941.5 327.5 L951.5 304 L958 278.5 L959.5 258.5 L958 243 L950.5 228.5 L938 215 L921.5 205 L903 202.5 L885 207 L870.5 219 L861 236.5 L858 244 Z\",\"color\":\"yellow\",\"strokeWidth\":2,\"isEraser\":false,\"penType\":2}]", 
      "stickBonus": true, 
      "tableId": 196
    }, 
    "sb": 0, 
    "sv": 14.799999999999999
  },
  {
    "a": 0, 
    "b": 0, 
    "bib": 12345, 
    "c": 1, 
    "competenceId": 5, 
    "cv": 0, 
    "d": 0, 
    "d3": 0, 
    "delt": 0, 
    "dv": 0, 
    "e": 0, 
    "e2": 0, 
    "e3": 0, 
    "eg": 0, 
    "event": "FX", 
    "f": 1, 
    "g": 0, 
    "h": 1, 
    "i": 0, 
    "id": 197, 
    "j": 0, 
    "name": "Luis2", 
    "nd": 0, 
    "noc": "Usa", 
    "number": 2, 
    "percentage": 0, 
    "rateGeneral": {
      "comments": "Jdjdjdjdjdjdjdjdjdjdjdndnc no CNDH dic me FMF  me Jdjdjdjdjdjdjdjdjdjdjdndnc no CNDH dic me FMF", 
      "compD": 0, 
      "compE": 0, 
      "compNd": 0, 
      "compScore": 0, 
      "compSd": 0, 
      "difficultyValues": 2.0999999999999996, 
      "eScore": 0, 
      "elementGroups1": 0, 
      "elementGroups2": 0, 
      "elementGroups3": 0, 
      "elementGroups4": 0, 
      "elementGroups5": 0, 
      "execution": 0, 
      "id": 111, 
      "myScore": 2.1999999999999997, 
      "numberOfElements": 4, 
      "paths": "[{\"path\":\"M25 224 L20.5 222.5 L20 220.5 L20 218.5 L18 215.5 L15 211 L11.5 208 L10 206 L10 206 L10.5 206 L14 206 L18.5 206.5 L21.5 207.5 L23 207.5 L23 208 L21.5 210 L18.5 212 L15 213 L11 213.5 L6.5 213.5 L4.5 213 L4 211.5 L4 209.5 L4 207 L5 204 L5.5 201.5 L5.5 200.5 L4.5 200 L2 200 L1.5 200\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M5 198.5 L15.5 209.5 L16 216 L15 222 L13.5 225.5 L11.5 226 L10.5 225.5 L8.5 222.5 L7 217.5 L6.5 213.5 L6 212.5 L6 213.5 L8 221 L11 235 L13 249.5 L13.5 261 L13.5 269.5 L13 272 L13 272.5 L13 270.5 L12.5 268 L12 267 L11 268 L10.5 280 L11 298.5 L11.5 314 L12 325 L12.5 332 L13.5 334.5 L15.5 335 L17 335.5 L17.5 337 L18 342 L18 351 L18 364.5 L18 379 L18 394.5 L17.5 407.5 L16.5 414 L16 416.5 L16 416 L15.5 411.5 L14.5 403.5 L13.5 395.5 L11.5 390.5 L10 390.5 L9 403 L8.5 420.5 L9 431.5 L9 436 L9 437 L9 436.5 L8.5 433.5 L7.5 428.5 L6.5 426 L5.5 427 L5 436 L5 446 L6 450.5 L8 451 L10 449 L11 445.5 L10.5 441.5 L8 438.5 L4.5 438.5 L1.5 444 L1 452 L1.5 458 L2.5 461 L3 462 L3.5 462.5 L4 462.5 L4 462.5 L5 461.5 L8 461 L14 462 L20.5 463.5 L28 463.5 L35.5 461.5 L43 459 L50.5 456.5 L58.5 454 L67 452 L76 451 L87 451 L97.5 450.5 L108.5 450 L120.5 449 L132.5 448.5 L145 448 L157.5 447 L171 446 L183.5 445 L197.5 444.5 L210.5 444 L222.5 443.5 L234 444.5 L245 446.5 L256 449 L266.5 450.5 L277.5 451.5 L288 451.5 L298.5 451.5 L308.5 451.5 L319 451.5 L329.5 451 L339.5 451.5 L349.5 454 L359.5 456 L369.5 456.5 L379 456.5 L389.5 456 L400 454 L410.5 452 L421 450.5 L431.5 450.5 L442 450.5 L452.5 450 L463 448.5 L473 446.5 L483 444.5 L493.5 443 L504 442.5 L514.5 442 L525 441.5 L535.5 440 L546.5 439.5 L558 439 L570 439 L582 438 L592.5 438 L602 438 L611 439.5 L619.5 441.5 L628.5 444.5 L638.5 446.5 L649 447.5 L659 447.5 L669 447 L679 445.5 L689 445 L700 444.5 L710.5 443.5 L720 442.5 L729.5 440.5 L738.5 440 L747 441 L756 444.5 L765 448 L774.5 450 L785.5 450 L796 448.5 L807.5 447.5 L818 447.5 L829 449 L840.5 450 L853.5 450 L866.5 447.5 L879.5 444 L891.5 442 L902.5 441.5 L913 444.5 L923.5 447.5 L934.5 449.5 L946.5 449 L958.5 446.5 L970 444 L980 443.5 L989.5 444.5 L998.5 447 L1007.5 449 L1017 449 L1026 447.5 L1033.5 446.5 L1040 447.5 L1045 452 L1050.5 457.5 L1056.5 460.5 L1064 461 L1072.5 457 L1080.5 451.5 L1085 448 L1087 447 L1087.5 446.5 L1088 446 L1090 442.5 L1093 436.5 L1095.5 429.5 L1097.5 425.5 L1098.5 424 L1099.5 423 L1101.5 419.5 L1105 414 L1107 409.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M1106 403 L1106.5 397 L1107.5 389.5 L1107.5 382 L1105.5 374.5 L1103 369 L1100 366 L1097 362 L1096 355.5 L1096.5 346 L1097.5 336 L1097.5 328.5 L1096 325 L1094 324 L1092 323.5 L1091.5 321 L1091 313.5 L1090 303.5 L1088 293 L1086.5 283.5 L1085.5 275.5 L1085.5 269 L1087 261 L1089.5 252.5 L1092 243 L1093.5 235 L1093.5 228.5 L1094 222.5 L1095 216.5 L1096.5 210 L1098 202.5 L1099.5 195 L1100.5 186.5 L1102 178 L1103.5 170.5 L1105 162.5 L1106 154 L1106 145 L1106.5 136 L1107.5 128.5 L1108 121.5 L1108 115.5 L1107 110.5 L1105 106 L1102.5 102 L1102 97 L1102.5 90 L1106.5 80.5 L1109.5 73 L1110.5 68.5 L1110.5 65 L1109 62 L1108.5 58.5 L1108.5 53.5 L1110 49 L1111 44 L1111.5 40 L1110.5 36.5 L1109 33 L1107.5 29 L1106.5 24.5 L1105.5 20 L1103.5 15.5 L1101 12 L1098 8 L1095 3.5 L1092.5 -1 L1089 -4 L1085 -6 L1079 -6.5 L1072 -4 L1065.5 -2 L1061 -1.5 L1055.5 -1.5 L1050 -3 L1044 -4 L1037.5 -6 L1030 -8 L1021 -9.5 L1011 -9.5 L999.5 -7 L987.5 -3.5 L976.5 -1.5 L967 -1.5 L958 -3.5 L949 -6 L938.5 -8 L926.5 -8.5 L914.5 -7.5 L902.5 -4.5 L892.5 -2.5 L884 -1 L875.5 -0.5 L867.5 -0.5 L859.5 -1.5 L853 -2 L847.5 -2.5 L842 -2.5 L836.5 -2 L833 -0.5 L831.5 0.5 L831.5 0.5 L833.5 0 L839 -1.5 L846.5 -4.5 L855 -8 L862.5 -10 L869 -10 L874.5 -7 L881 -3 L887.5 1 L893.5 4.5 L898.5 8.5 L903.5 11.5 L908 14.5 L914 16 L922 17 L931 17 L938.5 17 L945.5 18 L952.5 19 L959.5 19.5 L968.5 19.5 L980 19 L992.5 17 L1004.5 16 L1014.5 15.5 L1023 15 L1031 14.5 L1040 13 L1049 11 L1057 10.5 L1065 10.5 L1072.5 10.5 L1079 9.5 L1083 9 L1085 9 L1085.5 9.5 L1086 10 L1084 12 L1076.5 15.5 L1062.5 21.5 L1046 27.5 L1030 32 L1015 34 L1000.5 34.5 L984.5 34.5 L966.5 34.5 L946.5 34 L924.5 33.5 L901.5 35 L880 39 L860.5 42.5 L844 44.5 L829 46 L816.5 46 L804.5 44.5 L792 42 L779.5 39 L766.5 35.5 L753 33 L740 32.5 L727.5 35 L715 39 L704.5 41.5 L696 42 L688 41 L680.5 38 L671.5 34 L662.5 30.5 L652.5 28.5 L641 30.5 L629.5 36 L620 40.5 L612 43 L604 43.5 L596 43 L587.5 40.5 L578.5 38 L568.5 36.5 L558 36 L547 36 L536 36.5 L526 36 L516 34 L505.5 31.5 L494.5 31 L483 32 L471 34 L460 34.5 L449 33.5 L438 30.5 L426 29.5 L413 31 L400 34.5 L388.5 35.5 L378 34 L368.5 29.5 L358.5 25 L347 21 L335.5 19 L324 19 L312.5 21.5 L302.5 24 L293.5 25 L284 26 L274 27.5 L262.5 31 L251.5 34.5 L241 37 L231 37 L221 35 L210 33 L199.5 31.5 L189 33 L180 34 L171.5 34.5 L164 34.5 L156 34 L147.5 34 L139.5 34.5 L131 34.5 L122 33.5 L113 32 L104 30.5 L94.5 28 L85 26.5 L73 27.5 L66.5 30.5 L58 35.5 L50.5 39.5 L43.5 41.5 L37.5 41.5 L31.5 40.5 L26 40 L20.5 41 L16 46 L12.5 57 L10.5 66 L9 70.5 L8 72 L7 72 L7 65 L7 53 L7 43 L6 41 L5 49.5 L5.5 75.5 L7 101 L8 117 L8.5 128 L8.5 139 L7.5 145.5 L6 153 L5 160 L3.5 167 L2.5 172\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M593.5 151.5 L588.5 173.5 L586.5 191 L587.5 205 L596.5 211.5 L612 214 L627 210.5 L640.5 201.5 L649.5 188.5 L653.5 176 L651.5 165 L645 157.5 L637.5 156.5 L629 163 L624 176 L624 192.5 L630 202.5 L641.5 204 L656.5 201 L670.5 190.5 L678.5 177 L680 164 L674.5 153 L664 142 L651.5 134.5 L637.5 134 L624.5 146.5 L615.5 175.5 L614.5 208.5 L622 220.5 L636.5 218 L644.5 213.5 Z\",\"color\":\"yellow\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":2},{\"path\":\"M444.5 346.5 L501 369.5 L523 366.5 L545 362.5 L567.5 355.5 L590.5 345.5 L613 334 L635.5 320.5 L657.5 306 L677 294 L695.5 286.5 L714 283.5 L732 282.5 L747 284 L761.5 290 L775 298 L789.5 307.5 L805 318 L820.5 329 L837.5 339.5 L856 349.5 L876 357 L897 361 L918 361.5 L942 354 L954 346\",\"color\":\"red\",\"strokeWidth\":2,\"isEraser\":false,\"penType\":1},{\"path\":\"M55.5 349.5 L50.5 399 L50 406 L49 413.5 L49 417 L49.5 418.5 L54 420 L63 419.5 L81.5 417 L94 415.5 L111 413.5 L122.5 411\",\"color\":\"red\",\"strokeWidth\":2,\"isEraser\":false,\"penType\":1},{\"path\":\"M56 92 L63.5 91.5 L67.5 97 L72 110 L75.5 126 L78 140 L79.5 150.5 L80.5 158.5 L82.5 164 L85.5 167 L90 168.5 L97.5 168.5 L103.5 165.5 L114 156.5 L124.5 146 L133 138.5 L141 133.5 L145 131.5 L149.5 130 L154 130.5 L160 133 L167.5 138 L176 144 L184 151 L191.5 157 L204 161 L213.5 161.5 L225.5 161 L237 161.5 L250 169 L257 175.5 L266 183.5 L275.5 189 L284.5 193 L293.5 197 L303 200.5 L312.5 205 L322.5 208.5 L336.5 211 L345 210.5 L354 208 L362 206.5 L367 207 L370.5 210.5 L373.5 217 L376 223.5 L378.5 230 L382 239.5 L384.5 245.5 L388 254 L393 263 L399.5 269.5 L412 273 L420 273 L431 272 L441 270.5 L454 269.5 L462 269.5 L473.5 269.5 L484.5 270.5 L496 271.5 L511 272.5 L519.5 273 L531 274.5 L541.5 277 L556.5 280.5 L566.5 282 L580.5 282.5 L596 282.5 L610 283.5 L627.5 285.5 L638 288 L652 292 L663.5 296.5 L677 303.5 L684.5 308.5 L695 313.5 L706.5 317 L722 319.5 L731.5 320.5 L745 321 L759.5 321 L776 319.5 L796 317 L805.5 317 L816 320.5 L824 326.5 L830.5 333 L837.5 338.5 L846 342.5 L855 345.5 L865 347.5 L879 349.5 L887.5 350.5 L899 352 L911 353.5 L926 355 L933.5 357 L941.5 361 L949 365.5 L956.5 369 L965.5 372 L974 375 L983 378 L992.5 381 L1003 385 L1008.5 387.5 L1016.5 390.5 L1024 392.5 L1030.5 394 L1037 396 L1040 398 L1044 400.5 L1047.5 403 L1053.5 405.5 L1058 406 L1062.5 405.5 L1065 403.5\",\"color\":\"red\",\"strokeWidth\":2,\"isEraser\":false,\"penType\":1}]", 
      "stickBonus": true, 
      "tableId": 197
    }, 
    "sb": 0, 
    "sv": 2.0999999999999996
  },
  {
    "a": 0, 
    "b": 0, 
    "bib": 123456, 
    "c": 0, 
    "competenceId": 5, 
    "cv": 0, 
    "d": 0, 
    "d3": 0, 
    "delt": 4.5, 
    "dv": 0, 
    "e": 0, 
    "e2": 0, 
    "e3": 0, 
    "eg": 0, 
    "event": "VT", 
    "f": 0, 
    "g": 0, 
    "h": 0, 
    "i": 0, 
    "id": 198, 
    "j": 0, 
    "name": "Luis3", 
    "nd": 5.5, 
    "noc": "Si", 
    "number": 3, 
    "percentage": 0, 
    "rateGeneral": {
      "comments": "", 
      "compD": 0, 
      "compE": 0, 
      "compNd": 0, 
      "compScore": 0, 
      "compSd": 0, 
      "difficultyValues": 0, 
      "eScore": 4.5, 
      "elementGroups1": 0, 
      "elementGroups2": 0, 
      "elementGroups3": 0, 
      "elementGroups4": 0, 
      "elementGroups5": 0, 
      "execution": 5.5, 
      "id": 112, 
      "myScore": 0.7999999999999998, 
      "numberOfElements": 0, 
      "paths": "[{\"path\":\"M204.5 180.5 L215.5 184.5 L218.5 191.5 L220.5 195 L224.5 193 L230.5 181.5 L237 169 L245 161 L252 160 L258 164.5 L263 167.5 L268.5 167 L275 161 L282 154.5 L287.5 152 L291.5 153 L291.5 153.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M199 233 L214.5 228 L231 223 L250.5 217.5 L270.5 212.5 L288.5 207.5 L303 204 L314 202.5 L321 202 L323.5 202.5 L322.5 205\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M249.5 277.5 L265.5 282 L276.5 271 L285 265 L291 264.5 L293.5 272.5 L293.5 288.5 L294.5 302.5 L298.5 308.5 L308 305.5 L321 297.5 L334.5 289 L342.5 284.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M442.5 189.5 L447 176 L452.5 173 L457 173.5 L458.5 180.5 L455 194 L450 208 L447.5 215.5 L448 218 L453.5 217.5 L464 216 L474 213.5 L479 212.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M488 176.5 L494.5 177 L503 177 L509 178.5 L511 184.5 L508 195 L504 202.5 L503 204 L505 203.5 L509.5 205 L512 213 L511.5 227 L507.5 239.5 L502.5 247.5 L499 248.5 L498 243 L498 236 L498 234\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M439 158.5 L504 152.5 L515 154 L520 154\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M456 118 L479.5 106 L481 102 L480 99 L476 98 L471.5 98.5 L467 104.5 L463.5 112.5 L462.5 120.5 L464 125 L468.5 126.5 L476 124 L484 118.5 L490.5 112 L495 106.5 L497 102.5 L497.5 100 L495.5 100 L493 103.5 L492 109.5 L493 115.5 L497 119 L504 119.5 L512 115 L518.5 107.5 L522 100 L521 94.5 L514.5 94.5 L504.5 102.5 L496.5 115 L494.5 127 L498 135.5 L508 138.5 L516 136.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M678 191 L681.5 199 L690.5 197 L702 189.5 L710.5 181 L714.5 173.5 L714.5 169.5 L708.5 169 L700.5 172 L692.5 178 L688.5 186.5 L688.5 195 L693.5 199.5 L702.5 199.5 L711 196.5 L718.5 193.5 L722.5 191 L724.5 188.5 L724.5 186 L722.5 186 L718.5 191 L716.5 196 L719 198 L728 193.5 L739.5 186 L748.5 182 L751.5 184 L747.5 195 L738 208.5 L730.5 218 L728 220 L732 214 L741.5 205.5 L748.5 201.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M839 243.5 L860.5 213 L859 210 L852.5 210.5 L844 218 L838 229 L836 239.5 L838.5 246 L846 247.5 L856 243 L865 234.5 L872.5 225.5 L875.5 218 L876 214.5 L873 215 L869 222.5 L865.5 232 L865.5 239.5 L870 243.5 L878.5 242.5 L888 236.5 L897 226.5 L903.5 215 L905 208 L902.5 206 L895.5 212 L887 225 L883 234 L883 239 L889 240 L898.5 235.5 L908 227 L915 218 L917.5 212.5 L915 210 L907 216.5 L901 228 L900 236.5 L906 239 L920.5 234.5 L938 222.5 L954 210.5 L963 205.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M678 264.5 L757 253 L768 252.5 L774.5 255.5 L776 260.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M314.5 103 L309 94.5 L304 99 L296.5 105 L288 109.5 L279.5 112.5 L269.5 115.5 L259.5 118.5 L249.5 123.5 L238.5 130 L229 136.5 L218.5 142.5 L208.5 149 L198 156 L188.5 164.5 L178 174 L170.5 183.5 L164.5 191.5 L160 198.5 L157.5 205.5 L156.5 213.5 L156.5 223 L159 233 L163.5 243 L168.5 251.5 L175.5 259 L184 267.5 L192.5 276.5 L201.5 286 L212 295 L222 301.5 L234 307.5 L244.5 313.5 L256 319.5 L268 327 L279.5 334 L291.5 339.5 L304 343 L316.5 346 L329 348.5 L342.5 351 L356 353 L369.5 354.5 L384 355 L398 354 L411.5 351.5 L426 348.5 L440 344 L454 338.5 L469 331 L483.5 322.5 L497.5 315 L512 306 L526 296 L539.5 284 L555 270.5 L568 258 L580 246.5 L591 236 L600 226 L608 215 L615.5 203 L620 192.5 L621.5 183 L622 173.5 L621 163.5 L619 153.5 L616.5 143.5 L611 135.5 L604.5 129 L596.5 122.5 L588 116 L579.5 110 L570 105 L559.5 101 L549 98.5 L538 95.5 L527.5 93.5 L516.5 92 L504.5 91 L492.5 90.5 L480 91 L467 93 L455 94 L443 94.5 L430.5 94.5 L418 95 L406.5 96 L393.5 97 L381.5 98 L369 99 L356.5 101.5 L344.5 105 L333 108 L322 111.5 L313 115.5 L308.5 119.5 Z\",\"color\":\"yellow\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":2},{\"path\":\"M134.5 399 L141 396.5 L143 395.5 L144.5 396 L146.5 397 L148.5 398 L150.5 398.5 L152.5 398.5 L155 398.5 L158 399 L161.5 400.5 L164.5 402.5 L168 403 L171 403.5 L174.5 403.5 L177.5 403.5 L181.5 403.5 L186 402.5 L190.5 401 L196 398.5 L201.5 396 L206.5 394.5 L212 393 L217 392.5 L222 391.5 L227 390.5 L232.5 390 L237 390 L241 390 L245.5 390 L249.5 390 L254 390.5 L259 390 L263.5 390 L269 389.5 L274.5 388.5 L279.5 387.5 L285 386.5 L290.5 385.5 L296 385 L301.5 384.5 L306.5 383.5 L312 382.5 L316.5 382 L321 382 L325 382 L329.5 382.5 L334 382.5 L338.5 383 L343 383 L347.5 383 L352 383 L356.5 383.5 L360.5 383.5 L364.5 382.5 L368 382.5 L371.5 382.5 L374.5 382.5 L378 382.5 L381 382.5 L384 382.5 L386.5 382.5 L388.5 383 L390 383 L392 383 L393.5 383.5 L395.5 384 L397.5 384.5 L399.5 385.5 L400.5 385.5 L401 385.5 L401.5 385.5 L401.5 385.5 L402 385.5 L402.5 384.5 L403.5 382.5 L404 379.5 L404.5 375 L405 370 L405.5 365.5 L405.5 361 L405.5 356.5 L405.5 351.5 L405 346.5 L405 341.5 L404.5 337.5 L404 333 L404 328 L403.5 323 L403.5 317.5 L403.5 312.5 L403 307 L402.5 302.5 L402 297.5 L401.5 292.5 L401.5 287 L400.5 282 L400 278 L399.5 274 L399 269.5 L398.5 266 L398.5 263 L398.5 259.5 L399.5 255.5 L400 252 L400.5 250 L400.5 248.5 L401 248 L401.5 247.5 L402.5 246.5 L404.5 245.5 L406.5 244.5 L409 243.5 L411.5 243 L414.5 242.5 L418 242.5 L421.5 242 L425 241 L428.5 240.5 L432.5 240 L436 240 L440 240.5 L444 240.5 L447.5 240.5 L450.5 240.5 L454.5 240.5 L458.5 240.5 L463 240.5 L468 240.5 L473.5 240.5 L479.5 239.5 L485 238.5 L491 238 L495.5 237.5 L500.5 237 L506 237 L511 237 L516 237 L520 237 L523.5 237 L527.5 237 L530.5 237 L534 238 L537 238.5 L539.5 239.5 L542.5 240 L545.5 240 L548.5 240 L551.5 240 L553.5 240 L555.5 240 L557.5 240 L559.5 240 L562 240.5 L563 240.5 L565 240.5 L566 240.5 L566.5 241 L567.5 241 L568 241.5 L568.5 242 L569.5 242.5 L570 243 L570.5 243.5 L571 245 L571.5 247 L572 250 L572.5 253.5 L573 256.5 L574 260 L575 263 L576.5 267 L577.5 271 L578 276 L578.5 280.5 L579 285 L580 290 L581 294.5 L581.5 300 L581.5 305 L582 310.5 L582 316 L582 322 L582 328 L581.5 333.5 L581 338.5 L581 343.5 L580.5 348.5 L580 354 L579.5 358.5 L579.5 362.5 L579 366.5 L579 370 L578.5 373 L578.5 376 L578.5 378.5 L578 381 L578 383.5 L578 385.5 L578 386.5 L578.5 387 L579 387.5 L580 388.5 L581.5 389 L584 389.5 L586.5 390 L590 390 L594 390 L599 390.5 L603.5 390.5 L608.5 390 L613.5 390 L618 390 L622.5 391 L627.5 391.5 L632.5 392 L638 392.5 L643.5 393 L649 393.5 L654.5 393.5 L659.5 394 L665 394.5 L670.5 395 L676 395.5 L682 395.5 L687.5 395.5 L693.5 395.5 L699.5 395.5 L705.5 395 L711 394.5 L716.5 394.5 L721.5 394.5 L727.5 394 L733 393.5 L739 393.5 L744.5 393 L750.5 392.5 L756 392.5 L761.5 392 L767 392 L773.5 392 L778 392.5 L783.5 392.5 L789.5 392.5 L795.5 392 L801.5 391.5 L808 391 L814.5 390.5 L821 390 L828 389.5 L836.5 389 L841.5 388.5 L848.5 388 L855.5 387.5 L862.5 387.5 L869 387.5 L875.5 387.5 L882 387.5 L888.5 387.5 L895 387.5 L903 387 L907.5 387 L913.5 387 L919 387.5 L924.5 387.5 L931.5 388 L935.5 388 L940.5 388 L945 388.5 L950 389 L955 389.5 L960 390 L965 390.5 L969 391 L972.5 391.5 L975.5 392 L978.5 392.5 L981 393 L983 393.5 L984.5 394 L985.5 394.5 L986 394.5 L987 394.5 L988 392.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M778 70.5 L779.5 93 L780 97.5 L780 99.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M779.5 111.5 L778.5 118 L780 122 L782 126 L784.5 129.5 L786 133\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M775 173.5 L776.5 181 L779 185 L779.5 186.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M782 221 L782.5 231 L783 231.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M783 258 L781 268.5 L781.5 272.5 L782.5 276\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M780.5 307 L779 315 L779 318 L779.5 320\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M777 392 L777 392 L777 392 L777 392\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M775 383 L777.5 364 L778.5 362\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M571.5 236 L572.5 221 L572.5 218.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M568 206.5 L568 203.5 L568.5 200.5 L570 195.5 L571 193\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M571 130.5 L571 130.5 L571 130.5 L571 126 L571.5 123.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M571 98.5 L571 90.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M394.5 84 L394.5 84 L394.5 84 L394.5 90 L396.5 98 L398 103.5 L398 107.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M400 115.5 L402 124.5 L404 130.5 L406 134.5 L407 135\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M407 171.5 L408 180.5 L408.5 181.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0},{\"path\":\"M404 216 L405.5 225 L407 226.5\",\"color\":\"black\",\"strokeWidth\":3,\"isEraser\":false,\"penType\":0}]", 
      "stickBonus": false, 
      "tableId": 198, 
      "vaultDescription": "Handspring forward 3/2 turns", 
      "vaultNumber": "204"
    }, 
    "sb": 0, 
    "sv": 1.8
  },
  {
    "a": 0, 
    "b": 0, 
    "bib": 1234567, 
    "c": 0, 
    "competenceId": 5, 
    "cv": 0, 
    "d": 0, 
    "d3": 0, 
    "delt": 0, 
    "dv": 0, 
    "e": 0, 
    "e2": 0, 
    "e3": 0, 
    "eg": 0, 
    "event": "VT", 
    "f": 0, 
    "g": 0, 
    "h": 0, 
    "i": 0, 
    "id": 199, 
    "j": 0, 
    "name": "Luis4",
    "nd": 0, 
    "noc": "Cv", 
    "number": 4, 
    "percentage": 0, 
    "rateGeneral": {
      "comments": "", 
      "compD": 0, 
      "compE": 0, 
      "compNd": 0, 
      "compScore": 0, 
      "compSd": 0, 
      "difficultyValues": 0, 
      "eScore": 0, 
      "elementGroups1": 0, 
      "elementGroups2": 0, 
      "elementGroups3": 0, 
      "elementGroups4": 0, 
      "elementGroups5": 0, 
      "execution": 0, 
      "id": 113, 
      "myScore": 0, 
      "numberOfElements": 0, 
      "paths": "", 
      "stickBonus": false, 
      "tableId": 199
    }, 
    "sb": 0, 
    "sv": 0
  }
];

// Import generateHTML function from generate-jump-pdf.js
const generateHTML = (data, jumpImageBase64 = null) => {
  
  const renderWhiteboardPaths = (pathsString) => {
    if (!pathsString) return '';
    
    try {
      const paths = JSON.parse(pathsString);
      if (!Array.isArray(paths)) return '';
      
      return paths.map((pathData, index) => {
        let scaledPath = pathData.path;
        
        if (pathData.path) {
          scaledPath = pathData.path.replace(/([ML])\s*([0-9.-]+)\s*([0-9.-]+)/g, (match, command, x, y) => {
            const scaledX = parseFloat(x) * 1.6 - 240;
            const scaledY = parseFloat(y) * 1.6;
            return `${command} ${scaledX} ${scaledY}`;
          });
        }
        
        let pathElement = '';
        
        if (pathData.penType === 2) {
          pathElement = `
            <path 
              d="${scaledPath}" 
              stroke="${pathData.color || 'yellow'}" 
              stroke-width="4" 
              fill="${pathData.color || 'yellow'}" 
              fill-opacity="0.4" 
              stroke-opacity="0.8"
            />`;
        } else if (pathData.penType === 1) {
          pathElement = `
            <path 
              d="${scaledPath}" 
              stroke="red" 
              stroke-width="3" 
              fill="none" 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              opacity="1"
            />`;
        } else {
          pathElement = `
            <path 
              d="${scaledPath}" 
              stroke="${pathData.isEraser ? '#e0e0e0' : (pathData.color || 'black')}" 
              stroke-width="${pathData.strokeWidth || 3}" 
              fill="none" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            />`;
        }
        
        return pathElement;
      }).join('');
    } catch (error) {
      console.error('Error parsing paths:', error);
      return '';
    }
  };

  return`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 10px;
          line-height: 1.2;
          color: #333;
          background: #f5f5f5;
          padding: 8px;
        }
        
        .page {
          background: white;
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          page-break-after: always;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          background: linear-gradient(135deg, #0052b4, #004aad);
          color: white;
          padding: 12px;
          border-radius: 6px;
        }
        
        .header h1 {
          font-size: 18px;
          margin-bottom: 3px;
        }
        
        .header h2 {
          font-size: 14px;
          font-weight: normal;
        }
        
        .gymnast-info {
          background: #e8f4ff;
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 15px;
          border-left: 3px solid #0052b4;
          font-size: 9px;
        }
        
        .whiteboard-section {
          background: #f9f9f9;
          border-radius: 6px;
          padding: 15px 25px 20px 25px;
          border: 1px solid #ddd;
          margin-bottom: 15px;
          text-align: center;
        }
        
        .whiteboard-title {
          font-size: 12px;
          font-weight: bold;
          color: #0052b4;
          margin-bottom: 8px;
          text-align: center;
        }
        
        .whiteboard-canvas {
          width: 55%;
          height: 180px;
          background: #e0e0e0;
          border: 1px solid #ccc;
          border-radius: 4px;
          margin: 0 auto;
        }
        
        .tables-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .code-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 8px;
        }
        
        .code-table-header {
          background: #0052b4;
          color: white;
          text-align: center;
          padding: 6px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .code-table th,
        .code-table td {
          border: 1px solid #ddd;
          padding: 3px;
          text-align: center;
          font-weight: bold;
        }
        
        .code-table th {
          background: #f0f0f0;
          font-size: 7px;
        }
        
        .element-row {
          background: #a9def9;
        }
        
        .element-row.selected {
          background: #a9def9 !important; 
        }
        
        .element-row.selected td {
          background: #a9def9 !important;
          color: #333 !important; 
        }
                  .code-cell {
          background: #a9def9;
          color: #333;
        }

            .code-cell.selected {
          background: #28a745 !important; 
          color: white !important;
        }


        
        .number-cell {
          background: #a9def9;
          color: #333;
        }
        
        .number-cell.selected {
          background: #28a745 !important; 
          color: white !important;
        }

                .sel-cell {
          background: #a9def9;
          color: #333;
        }

          .sel-cell.selected {
          background: #28a745 !important;
          color: white !important;
        }
        
        .selected-value {
          color: #333; 
        }

        .selected-value.has-selection {
          background: #28a745 !important; 
          color: white !important;
        }
        
        .info-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 8px;
          border: 1px solid #ddd;
        }
        
        .info-table tr {
          height: 22px;
        }
        
        .info-label {
          background: #a9def9;
          padding: 3px 6px;
          font-weight: bold;
          text-align: right;
          width: 120px;
          border: 1px solid #ddd;
          font-size: 8px;
        }
        
        .info-value {
          background: #6B9BDF;
          padding: 3px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #ddd;
          font-size: 10px;
        }
        
        .info-value.green {
          background: #00b050;
        }
        
        .info-value.red {
          background: #ff9b9b;
        }
        
        .info-value.yellow {
          background: #f8c471;
        }
        
        .info-value.orange {
          background: #ffcb41;
        }
        
        .info-label.cv {
          background: #00b050;
        }
        
        .element-groups {
          display: flex;
          flex: 1;
        }
        
        .element-group {
          flex: 1;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .group-header {
          background: #D9D9D9;
          padding: 3px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .group-value {
          background: #6B9BDF;
          padding: 3px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .score-groups {
          display: flex;
          flex: 1;
        }
        
        .score-group {
          flex: 1;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .score-header {
          background: #D9D9D9;
          padding: 3px;
          font-weight: bold;
          font-size: 8px;
        }
        
        .score-value {
          padding: 3px;
          font-weight: bold;
          font-size: 9px;
        }
        
        .score-value.cv {
          background: #f8c471;
        }
        
        .score-value.sb {
          background: #00b050;
          color: white;
        }
        
        .score-value.nd {
          background: #ff9b9b;
        }
        
        .score-value.sv {
          background: #6B9BDF;
        }
        
        .competition-section {
          background: white;
          border-radius: 4px;
          margin: 0 auto 10px auto;
          max-width: 600px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .competition-header {
          background: #00b050;
          color: white;
          text-align: center;
          padding: 6px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .comp-row {
          display: flex;
          height: 25px;
        }
        
        .comp-label {
          background: #00b050;
          color: white;
          text-align: center;
          padding: 3px 6px;
          font-weight: bold;
          width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
        }
        
        .comp-cell {
          flex: 1;
          background: #D9D9D9;
          text-align: center;
          padding: 3px;
          font-weight: bold;
          border: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
        }
        
        .comp-value {
          flex: 1;
          background: #00b050;
          color: white;
          text-align: center;
          padding: 3px;
          font-weight: bold;
          border: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }
        
        .comments-section {
          background: white;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .comments-section h3 {
          color: #0052b4;
          margin-bottom: 6px;
          border-bottom: 1px solid #0052b4;
          padding-bottom: 3px;
          font-size: 11px;
        }
        
        .comments-text {
          font-size: 9px;
          line-height: 1.3;
          text-align: justify;
        }
        
        .footer {
          text-align: center;
          margin-top: 15px;
          font-size: 8px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 8px;
        }
        
        @media print {
          body { padding: 5px; }
          .page { margin-bottom: 0; page-break-after: always; }
          .header h1 { font-size: 16px; }
        }
      </style>
    </head>
    <body>
      ${data.map((gymnast, index) => `
        <div class="page">
          
          
          <div class="gymnast-info">
            <strong>Gymnast:</strong> ${gymnast.name || 'Unknown'} | 
            <strong>NOC:</strong> ${gymnast.noc || 'UNK'} | 
            <strong>Event:</strong> ${gymnast.event || 'FX'} | 
            <strong>Number:</strong> ${gymnast.number || 0} | 
            <strong>BIB:</strong> ${gymnast.bib || 0} | 
            <strong>Performance:</strong> ${gymnast.percentage || 0}%
          </div>
          
          <!-- Full Width Whiteboard Section -->
          <div class="whiteboard-section">
            <div class="whiteboard-title">Judge's Whiteboard</div>
            <svg class="whiteboard-canvas" viewBox="0 0 1300 780" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              ${renderWhiteboardPaths(gymnast.rateGeneral?.paths || '')}
            </svg>
          </div>
          
          <!-- Tables Section Below Whiteboard -->
          <div class="tables-section">
            <!-- Code Table Section -->
            <div>
              <div class="code-table-header">Elements Code Table</div>
              <table class="code-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th></th><th>N</th><th>U</th><th>N</th><th>B</th>
                    <th>E</th><th>R</th><th></th>
                    <th>Sel</th><th>Val</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.j || 0) > 0 ? 'selected' : ''}">J</td>
                    <td class="number-cell ${(gymnast.j || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.j || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.j || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.j || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.j || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.j || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.j || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.j || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.j || 0) > 0 ? 'selected' : ''}">${gymnast.j || 0}</td>
                    <td class="${(gymnast.j || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">J</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.i || 0) > 0 ? 'selected' : ''}">I</td>
                    <td class="number-cell ${(gymnast.i || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.i || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.i || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.i || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.i || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.i || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.i || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.i || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.i || 0) > 0 ? 'selected' : ''}">${gymnast.i || 0}</td>
                    <td class="${(gymnast.i || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">I</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.h || 0) > 0 ? 'selected' : ''}">H</td>
                    <td class="number-cell ${(gymnast.h || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.h || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.h || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.h || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.h || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.h || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.h || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.h || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.h || 0) > 0 ? 'selected' : ''}">${gymnast.h || 0}</td>
                    <td class="${(gymnast.h || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">H</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.g || 0) > 0 ? 'selected' : ''}">G</td>
                    <td class="number-cell ${(gymnast.g || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.g || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.g || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.g || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.g || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.g || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.g || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.g || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.g || 0) > 0 ? 'selected' : ''}">${gymnast.g || 0}</td>
                    <td class="${(gymnast.g || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">G</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.f || 0) > 0 ? 'selected' : ''}">F</td>
                    <td class="number-cell ${(gymnast.f || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.f || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.f || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.f || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.f || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.f || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.f || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.f || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.f || 0) > 0 ? 'selected' : ''}">${gymnast.f || 0}</td>
                    <td class="${(gymnast.f || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">F</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.e || 0) > 0 ? 'selected' : ''}">E</td>
                    <td class="number-cell ${(gymnast.e || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.e || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.e || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.e || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.e || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.e || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.e || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.e || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.e || 0) > 0 ? 'selected' : ''}">${gymnast.e || 0}</td>
                    <td class="${(gymnast.e || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">E</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.d || 0) > 0 ? 'selected' : ''}">D</td>
                    <td class="number-cell ${(gymnast.d || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.d || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.d || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.d || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.d || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.d || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.d || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.d || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.d || 0) > 0 ? 'selected' : ''}">${gymnast.d || 0}</td>
                    <td class="${(gymnast.d || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">D</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.c || 0) > 0 ? 'selected' : ''}">C</td>
                    <td class="number-cell ${(gymnast.c || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.c || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.c || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.c || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.c || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.c || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.c || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.c || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.c || 0) > 0 ? 'selected' : ''}">${gymnast.c || 0}</td>
                    <td class="${(gymnast.c || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">C</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.b || 0) > 0 ? 'selected' : ''}">B</td>
                    <td class="number-cell ${(gymnast.b || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.b || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.b || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.b || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.b || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.b || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.b || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.b || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.b || 0) > 0 ? 'selected' : ''}">${gymnast.b || 0}</td>
                    <td class="${(gymnast.b || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">B</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.a || 0) > 0 ? 'selected' : ''}">A</td>
                    <td class="number-cell ${(gymnast.a || 0) === 1 ? 'selected' : ''}">1</td>
                    <td class="number-cell ${(gymnast.a || 0) === 2 ? 'selected' : ''}">2</td>
                    <td class="number-cell ${(gymnast.a || 0) === 3 ? 'selected' : ''}">3</td>
                    <td class="number-cell ${(gymnast.a || 0) === 4 ? 'selected' : ''}">4</td>
                    <td class="number-cell ${(gymnast.a || 0) === 5 ? 'selected' : ''}">5</td>
                    <td class="number-cell ${(gymnast.a || 0) === 6 ? 'selected' : ''}">6</td>
                    <td class="number-cell ${(gymnast.a || 0) === 7 ? 'selected' : ''}">7</td>
                    <td class="number-cell ${(gymnast.a || 0) === 8 ? 'selected' : ''}">8</td>
                    <td class="sel-cell ${(gymnast.a || 0) > 0 ? 'selected' : ''}">${gymnast.a || 0}</td>
                    <td class="${(gymnast.a || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}">A</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Info Table -->
            <div>
              <table class="info-table">
                <tr>
                  <td class="info-label">NUMBER OF ELEMENTS</td>
                  <td class="info-value ${(gymnast.rateGeneral?.numberOfElements || 0) >= 6 && (gymnast.rateGeneral?.numberOfElements || 0) <= 8 ? 'green' : 'red'}">
                    ${gymnast.rateGeneral?.numberOfElements || 0}
                  </td>
                </tr>
                <tr>
                  <td class="info-label">DIFFICULTY VALUES</td>
                  <td class="info-value">${(gymnast.rateGeneral.difficultyValues || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td class="info-label">ELEMENT GROUPS</td>
                  <td class="element-groups">
                    <div class="element-group">
                      <div class="group-header">I</div>
                      <div class="group-value">${(gymnast.rateGeneral?.elementGroups1 || 0).toFixed(1)}</div>
                    </div>
                    <div class="element-group">
                      <div class="group-header">II</div>
                      <div class="group-value">${(gymnast.rateGeneral?.elementGroups2 || 0).toFixed(1)}</div>
                    </div>
                    <div class="element-group">
                      <div class="group-header">III</div>
                      <div class="group-value">${(gymnast.rateGeneral?.elementGroups3 || 0).toFixed(1)}</div>
                    </div>
                    <div class="element-group">
                      <div class="group-header">IV</div>
                      <div class="group-value">${(gymnast.rateGeneral?.elementGroups4 || 0).toFixed(1)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="info-label">ELEMENT GROUPS TOTAL</td>
                  <td class="info-value">${(gymnast.rateGeneral?.elementGroups5 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td class="info-label">SCORES</td>
                  <td class="score-groups">
                    <div class="score-group">
                      <div class="score-header">CV</div>
                      <div class="score-value cv">${(gymnast.cv || 0).toFixed(1)}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">SB</div>
                      <div class="score-value sb">${(gymnast.sb || 0).toFixed(1)}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">ND</div>
                      <div class="score-value nd">${(gymnast.nd || 0).toFixed(1)}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">SV</div>
                      <div class="score-value sv">${(gymnast.sv || 0).toFixed(1)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="info-label">EXECUTION</td>
                  <td class="info-value">${(gymnast.rateGeneral?.execution || gymnast.e2 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td class="info-label">E SCORE</td>
                  <td class="info-value">${(gymnast.rateGeneral?.eScore || gymnast.e3 || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td class="info-label">MY SCORE</td>
                  <td class="info-value orange">${(gymnast.rateGeneral?.myScore || 0).toFixed(3)}</td>
                </tr>
              </table>
            </div>
          </div>
          
          <!-- Competition Section Below Tables -->
          <div class="competition-section">
            <div class="comp-row">
              <div class="comp-label">COMPETITION</div>
              <div class="comp-cell">D</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compD || gymnast.d3 || 0).toFixed(1)}</div>
              <div class="comp-cell">E</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compE || gymnast.e3 || 0).toFixed(3)}</div>
              <div class="comp-cell">SB</div>
              <div class="comp-value">${gymnast.rateGeneral?.stickBonus ? '0.1' : (gymnast.sb || 0).toFixed(1)}</div>
              <div class="comp-cell">ND</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compNd || gymnast.nd || 0).toFixed(1)}</div>
              <div class="comp-cell">SCORE</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compScore || 0).toFixed(3)}</div>
            </div>
          </div>
          
          <!-- Comments Section -->
          <div class="comments-section">
            <h3>💬 Judge Comments</h3>
            <div class="comments-text">
              ${gymnast.rateGeneral?.comments || 'No comments provided for this routine.'}
            </div>
          </div>
          
          ${index === data.length - 1 ? `
            <div class="footer">
              <p><strong>Generated by GymJudge</strong> on ${new Date().toLocaleString()}</p>
              <p>© 2025 GymJudge. All rights reserved. | Report ID: GJ-${Date.now()}</p>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </body>
    </html>
  `;
};

// Keep track of server restart time for auto-refresh
let serverStartTime = Date.now();

app.get('/', (req, res) => {
  const html = generateHTML(sampleData, jumpImageBase64);
  res.send(html);
});

// Endpoint to check for changes (used by auto-refresh script)
app.get('/check-changes', (req, res) => {
  res.json({ timestamp: serverStartTime });
});

app.listen(port, () => {
  serverStartTime = Date.now(); // Update timestamp when server restarts
  console.log(`🚀 Preview server running at http://localhost:${port}`);
  console.log('🔄 Auto-refresh enabled - browser will reload on changes!');
  console.log('✏️  Edit the HTML/CSS and save to see changes instantly!');
  
  if (jumpImageBase64) {
    console.log('✅ Vault background image loaded successfully!');
  } else {
    console.log('⚠️  No vault background image found. Place "Jump.png" in the same folder.');
  }
  
  console.log(`📄 Generating report for ${sampleData.length} gymnast(s)`);
});