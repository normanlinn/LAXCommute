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
    title: 'LAX employee shuttle tracking and boarding guide',
    introduction:
      'LAXCommute helps airport employees check South, East and West parking shuttle arrival estimates, choose boarding stops and save an everyday commute. Use the tracker for free without signing in.',
    routes: [
      {
        title: 'South Lot employee shuttle',
        text: 'The South route serves all terminals. Select South, choose a South Lot boarding stop to go to work, or select a terminal stop to return to parking.',
      },
      {
        title: 'East Lot employee shuttle',
        text: 'The East route serves Terminals 1–3 and Terminal B (TBIT). East Lot is the default boarding area. You can also select South Lot stops #1, #2 or #3 listed on the East route to check when an East shuttle will reach you.',
      },
      {
        title: 'West Lot employee shuttle',
        text: 'The West route serves Terminals 4–7. West Lot is the default boarding area. You can also select South Lot stops #1, #2 or #3 listed on the West route to check an approaching West shuttle.',
      },
    ],
    questions: [
      {
        title: 'How do I track an employee shuttle at LAX?',
        text: 'Choose South, East or West under “Which shuttle do you want?” Set “To work” or “To parking,” then choose “Where are you boarding?” The map and next departures update for the selected route and stop. Use “Show other stops” to see more boarding points, or open walking directions in Apple Maps or Google Maps.',
      },
      {
        title: 'Can I catch an East or West shuttle from South Lot?',
        text: 'Yes, when the selected route lists that South Lot boarding stop. Keep East or West selected and choose the South stop. Arrival estimates remain for that shuttle route; selecting South Lot as your boarding location does not switch you to the South shuttle.',
      },
      {
        title: 'Do I need to install an app or create an account?',
        text: 'No. Open LAXCommute in your browser. You can optionally add it to your phone’s home screen and save your usual terminal, boarding stops and walking time. Guest settings are saved on your device; signing in lets you sync your commute.',
      },
      {
        title: 'How reliable are the arrival estimates?',
        text: 'Times and bus positions come from the public LAX shuttle tracker feed and need an internet connection. Estimates can change with traffic and operations. Scheduled times are labeled, and expired predictions are removed. If data is unavailable, check the original tracker below.',
      },
    ],
    sourceLink: 'LAX employee parking shuttle tracker',
    note: 'LAXCommute is an independent employee commute tool, not an official LAWA or airline service. It tracks employee parking shuttles rather than hotel, FlyAway or private passenger shuttle services.',
    back: 'Back to the live shuttle tracker',
  },
  my: {
    title: 'LAX ဝန်ထမ်းကြိုပို့ယာဉ် တည်နေရာနှင့် စီးနည်းလမ်းညွှန်',
    introduction:
      'LAXCommute ဖြင့် လေဆိပ်ဝန်ထမ်းများသည် South၊ East နှင့် West ကားရပ်နားကွင်းကြိုပို့ယာဉ် ရောက်ချိန်ကို ကြည့်နိုင်ပြီး စီးမည့်မှတ်တိုင်နှင့် နေ့စဉ်ခရီးစဉ်ကို သိမ်းထားနိုင်သည်။ အကောင့်မဝင်ဘဲ အခမဲ့သုံးနိုင်သည်။',
    routes: [
      {
        title: 'South Lot ဝန်ထမ်းကြိုပို့ယာဉ်',
        text: 'South လမ်းကြောင်းသည် Terminal အားလုံးသို့ ပြေးဆွဲသည်။ အလုပ်သို့သွားရန် South ကိုရွေးပြီး South Lot မှတ်တိုင်ကို ရွေးပါ။ ကားရပ်နားရာသို့ ပြန်ရန် Terminal မှတ်တိုင်ကို ရွေးပါ။',
      },
      {
        title: 'East Lot ဝန်ထမ်းကြိုပို့ယာဉ်',
        text: 'East လမ်းကြောင်းသည် Terminal 1–3 နှင့် Terminal B (TBIT) သို့ ပြေးဆွဲသည်။ ပုံမှန်စီးမည့်နေရာသည် East Lot ဖြစ်သည်။ East လမ်းကြောင်းတွင်ပါသော South Lot မှတ်တိုင် #1၊ #2 သို့မဟုတ် #3 ကိုလည်း ရွေးပြီး East ကား သင့်ထံရောက်မည့်အချိန်ကို ကြည့်နိုင်သည်။',
      },
      {
        title: 'West Lot ဝန်ထမ်းကြိုပို့ယာဉ်',
        text: 'West လမ်းကြောင်းသည် Terminal 4–7 သို့ ပြေးဆွဲသည်။ ပုံမှန်စီးမည့်နေရာသည် West Lot ဖြစ်သည်။ West လမ်းကြောင်းတွင်ပါသော South Lot မှတ်တိုင် #1၊ #2 သို့မဟုတ် #3 ကိုလည်း ရွေးပြီး West ကား ရောက်မည့်အချိန်ကို ကြည့်နိုင်သည်။',
      },
    ],
    questions: [
      {
        title: 'LAX ဝန်ထမ်းကြိုပို့ယာဉ်ကို ဘယ်လိုကြည့်ရမလဲ။',
        text: 'ကြိုပို့ယာဉ်ရွေးရာတွင် South၊ East သို့မဟုတ် West ကို ရွေးပါ။ အလုပ်သို့ သို့မဟုတ် ကားရပ်နားရာသို့ကို ရွေးပြီး စီးမည့်မှတ်တိုင်ကို ရွေးပါ။ မြေပုံနှင့် ကားရောက်ချိန်သည် ရွေးထားသောလမ်းကြောင်းနှင့် မှတ်တိုင်အတွက် ပြပေးမည်။ အခြားမှတ်တိုင်များကို ပြနိုင်ပြီး Apple Maps သို့မဟုတ် Google Maps ဖြင့် လမ်းလျှောက်လမ်းညွှန်ကို ဖွင့်နိုင်သည်။',
      },
      {
        title: 'South Lot မှ East သို့မဟုတ် West ကားကို စီးနိုင်သလား။',
        text: 'ရွေးထားသောလမ်းကြောင်းတွင် ထို South Lot မှတ်တိုင် ပါလျှင် စီးနိုင်သည်။ East သို့မဟုတ် West ကို ဆက်ရွေးထားပြီး South မှတ်တိုင်ကို ရွေးပါ။ ပြထားသောရောက်ချိန်သည် ထိုကြိုပို့ယာဉ်အတွက်ဖြစ်ပြီး South ကားအဖြစ် လမ်းကြောင်းမပြောင်းပါ။',
      },
      {
        title: 'အက်ပ်ထည့်ရန် သို့မဟုတ် အကောင့်ဖွင့်ရန် လိုသလား။',
        text: 'မလိုပါ။ ဘရောက်ဇာတွင် LAXCommute ကို ဖွင့်သုံးနိုင်သည်။ လိုလျှင် ဖုန်းပင်မမျက်နှာပြင်တွင် ထည့်ပြီး ပုံမှန် Terminal၊ မှတ်တိုင်နှင့် လမ်းလျှောက်ချိန်ကို သိမ်းနိုင်သည်။ အကောင့်မဝင်ဘဲ သိမ်းသောဆက်တင်များသည် ဤစက်တွင်ရှိပြီး အကောင့်ဝင်လျှင် စက်အချင်းချင်း ခရီးစဉ်မျှဝေနိုင်သည်။',
      },
      {
        title: 'ခန့်မှန်းရောက်ချိန်ကို ဘယ်လောက်ယုံကြည်နိုင်သလဲ။',
        text: 'ရောက်ချိန်နှင့် ကားတည်နေရာကို LAX မူရင်းကြိုပို့ယာဉ်ဒေတာမှ ရယူသဖြင့် အင်တာနက်လိုအပ်သည်။ ယာဉ်ကြောနှင့် ပြေးဆွဲမှုအခြေအနေကြောင့် ခန့်မှန်းချိန် ပြောင်းနိုင်သည်။ အချိန်ဇယားအရဖြစ်လျှင် အညွှန်းပြထားပြီး ဟောင်းနေသောခန့်မှန်းချိန်ကို ဖယ်ရှားပေးသည်။ ဒေတာမရလျှင် အောက်ပါ မူရင်းကားတည်နေရာလင့်ခ်တွင် စစ်ပါ။',
      },
    ],
    sourceLink: 'LAX မူရင်းဝန်ထမ်းကြိုပို့ယာဉ် တည်နေရာ',
    note: 'LAXCommute သည် ဝန်ထမ်းတစ်ဦးချင်းခရီးအတွက် သီးခြားဖန်တီးထားသောဝန်ဆောင်မှုဖြစ်ပြီး LAWA သို့မဟုတ် လေကြောင်းလိုင်း၏ တရားဝင်ဝန်ဆောင်မှု မဟုတ်ပါ။ ဝန်ထမ်းကားရပ်နားကွင်းကြိုပို့ယာဉ်များကိုသာ ပြပြီး ဟိုတယ်၊ FlyAway သို့မဟုတ် ပုဂ္ဂလိကခရီးသည်ကြိုပို့ယာဉ်များ မပါဝင်ပါ။',
    back: 'လက်ရှိကြိုပို့ယာဉ် တည်နေရာသို့ ပြန်သွားမည်',
  },
};
