import type { Language } from './LanguageProvider';

type Guide = {
  title: string;
  introduction: string;
  routes: { title: string; text: string }[];
  questions: { title: string; text: string }[];
  sourceLink: string;
  note: string;
  back: string;
};
export const guides: Record<Language, Guide> = {
  en: {
    title: 'LAX shuttle boarding guide',
    introduction:
      'Pick South, East or West, then choose the stop where you’re waiting. The map shows that route’s buses, and arrival times are for your selected stop. No account needed.',
    routes: [
      {
        title: 'South Lot',
        text: 'Serves all terminals. Choose a South Lot stop for your trip to work, or a terminal stop for the trip back.',
      },
      {
        title: 'East Lot',
        text: 'Serves Terminals 1–3 and Terminal B (TBIT). East Lot is selected first. Waiting at South Lot instead? Keep East selected and choose a South stop listed on this route.',
      },
      {
        title: 'West Lot',
        text: 'Serves Terminals 4–7. West Lot is selected first. You can also board at a South Lot stop listed on the West route. Keep West selected to see West buses.',
      },
    ],
    questions: [
      {
        title: 'How do I save my trip?',
        text: 'Open My commute in the bottom menu. Choose your lot, terminal and usual stops, then save. Leave Remember my commute on to keep them in this browser. Clearing this site’s browser data removes them. Sign in if you want to sync across devices.',
      },
      {
        title: 'What if I’m at a different stop today?',
        text: 'Choose that stop on the map page. Your saved commute stays the same. For an East or West bus at South Lot, keep your bus route selected and choose a South stop from its list.',
      },
      {
        title: 'Can I put this on my home screen?',
        text: 'Yes. On iPhone, open the browser’s Share menu and choose Add to Home Screen. On Android, look for Install app or Add to Home screen in the browser menu.',
      },
      {
        title: 'Why did the arrival time change?',
        text: 'Bus positions and estimates come from the public LAX tracker. Traffic, service changes or a delayed feed can affect them. A scheduled time isn’t a live prediction. If the feed is unavailable, try the original tracker below.',
      },
    ],
    sourceLink: 'Open the original LAX tracker',
    note: 'An independent app for LAX employees. Not an official LAWA or airline service. This tracker covers employee parking shuttles; FlyAway and hotel shuttles aren’t included.',
    back: 'Back to the map',
  },
  my: {
    title: 'LAX ကြိုပို့ယာဉ် စီးနည်းလမ်းညွှန်',
    introduction:
      'South၊ East သို့မဟုတ် West ကို ရွေးပြီး သင်စောင့်နေသောမှတ်တိုင်ကို ရွေးပါ။ မြေပုံတွင် ထိုလမ်းကြောင်းရှိကားများနှင့် ရွေးထားသောမှတ်တိုင်အတွက် ရောက်ချိန်ကို ပြပေးပါတယ်။ အကောင့်မလိုပါ။',
    routes: [
      {
        title: 'South Lot',
        text: 'Terminal အားလုံးသို့ ပြေးဆွဲပါတယ်။ အလုပ်သွားရန် South Lot မှတ်တိုင်ကို ရွေးပါ။ အပြန်ခရီးအတွက် Terminal မှတ်တိုင်ကို ရွေးပါ။',
      },
      {
        title: 'East Lot',
        text: 'Terminal 1–3 နှင့် Terminal B (TBIT) သို့ ပြေးဆွဲပါတယ်။ အစတွင် East Lot ကို ရွေးထားပါတယ်။ South Lot မှာ စောင့်နေလျှင် East ကို ဆက်ရွေးထားပြီး ဤလမ်းကြောင်းစာရင်းထဲမှ South မှတ်တိုင်ကို ရွေးပါ။',
      },
      {
        title: 'West Lot',
        text: 'Terminal 4–7 သို့ ပြေးဆွဲပါတယ်။ အစတွင် West Lot ကို ရွေးထားပါတယ်။ West လမ်းကြောင်းစာရင်းထဲမှ South Lot မှတ်တိုင်မှာလည်း စီးနိုင်ပါတယ်။ West ကားများကို ကြည့်ရန် West ကို ဆက်ရွေးထားပါ။',
      },
    ],
    questions: [
      {
        title: 'ခရီးစဉ်ကို ဘယ်လိုသိမ်းရမလဲ။',
        text: 'အောက်ခြေမီနူးမှ ကျွန်ုပ်၏ခရီးစဉ်ကို ဖွင့်ပါ။ ကားရပ်နားကွင်း၊ Terminal နှင့် ပုံမှန်မှတ်တိုင်များကို ရွေးပြီး သိမ်းပါ။ ဤဘရောက်ဇာတွင် သိမ်းထားရန် ခရီးစဉ်ကို မှတ်ထားမည်ကို ဖွင့်ထားပါ။ ဤဝက်ဘ်ဆိုက်၏ ဘရောက်ဇာဒေတာကို ရှင်းလျှင် သိမ်းထားသည်များ ပျက်သွားပါမယ်။ စက်အချင်းချင်း ခရီးစဉ်မျှဝေလိုလျှင် အကောင့်ဝင်ပါ။',
      },
      {
        title: 'ဒီနေ့ အခြားမှတ်တိုင်မှာ စောင့်နေလျှင် ဘယ်လိုလုပ်ရမလဲ။',
        text: 'မြေပုံစာမျက်နှာတွင် ထိုမှတ်တိုင်ကို ရွေးပါ။ သိမ်းထားသောခရီးစဉ် မပြောင်းပါ။ South Lot မှ East သို့မဟုတ် West ကားစီးရန် ထိုကားလမ်းကြောင်းကို ဆက်ရွေးထားပြီး စာရင်းထဲမှ South မှတ်တိုင်ကို ရွေးပါ။',
      },
      {
        title: 'ဖုန်းပင်မမျက်နှာပြင်မှာ ထည့်နိုင်သလား။',
        text: 'ထည့်နိုင်ပါတယ်။ iPhone တွင် ဘရောက်ဇာ၏ Share မီနူးမှ Add to Home Screen ကို ရွေးပါ။ Android တွင် ဘရောက်ဇာမီနူးရှိ Install app သို့မဟုတ် Add to Home screen ကို ရှာပါ။',
      },
      {
        title: 'ရောက်ချိန်က ဘာလို့ပြောင်းသွားတာလဲ။',
        text: 'ကားတည်နေရာနှင့် ခန့်မှန်းရောက်ချိန်ကို LAX မူရင်းဒေတာမှ ရယူပါတယ်။ ယာဉ်ကြော၊ ပြေးဆွဲမှုအပြောင်းအလဲနှင့် ဒေတာနောက်ကျမှုကြောင့် ရောက်ချိန် ပြောင်းနိုင်ပါတယ်။ အချိန်ဇယားအရ ပြသောအချိန်သည် လက်ရှိခန့်မှန်းချိန် မဟုတ်ပါ။ ဒေတာမရလျှင် အောက်ပါ မူရင်းလင့်ခ်တွင် ကြည့်ပါ။',
      },
    ],
    sourceLink: 'LAX မူရင်းကားတည်နေရာကို ဖွင့်မည်',
    note: 'LAX ဝန်ထမ်းများအတွက် သီးခြားဖန်တီးထားသောအက်ပ်ပါ။ LAWA သို့မဟုတ် လေကြောင်းလိုင်း၏ တရားဝင်ဝန်ဆောင်မှု မဟုတ်ပါ။ ဝန်ထမ်းကားရပ်နားကွင်းကြိုပို့ယာဉ်များကို ပြပေးပြီး FlyAway နှင့် ဟိုတယ်ကားများ မပါဝင်ပါ။',
    back: 'မြေပုံသို့ ပြန်သွားမည်',
  },
};
