// Last successful operator route data, retained for outage/offline wayfinding.
// Never contains vehicles, arrival predictions, or fabricated stop coordinates.
import type { Stop } from '../types.ts';
export const routeSnapshots: Record<
  number,
  { stops: Stop[]; patterns: { id: number; shape: string }[]; fetchedAt: string }
> = {
  '6883': {
    stops: [
      {
        id: 11319089,
        name: 'South Lot Stop #1',
        lat: 33.95313,
        lon: -118.393406,
      },
      {
        id: 11319091,
        name: 'Terminal 4 - Lower Level',
        lat: 33.942585,
        lon: -118.40617,
      },
      {
        id: 11319093,
        name: 'Terminal 6 - Lower Level',
        lat: 33.942976,
        lon: -118.40242,
      },
      {
        id: 11319094,
        name: 'Terminal 7 - Lower Level',
        lat: 33.94332,
        lon: -118.399168,
      },
      {
        id: 11319095,
        name: 'West Lot Stop #1',
        lat: 33.955508,
        lon: -118.389687,
      },
      {
        id: 11319096,
        name: 'West Lot Stop #2',
        lat: 33.955306,
        lon: -118.391364,
      },
      {
        id: 11319097,
        name: 'West Lot Stop #3',
        lat: 33.954534,
        lon: -118.391047,
      },
      {
        id: 11319098,
        name: 'West Lot Stop #4',
        lat: 33.953756,
        lon: -118.390378,
      },
      {
        id: 11319099,
        name: 'West Lot Layover',
        lat: 33.953473,
        lon: -118.389506,
      },
      {
        id: 11443961,
        name: 'South Lot Drop Off',
        lat: 33.954436,
        lon: -118.393478,
      },
      {
        id: 12197090,
        name: 'South Lot Stop #2',
        lat: 33.952422,
        lon: -118.394823,
      },
      {
        id: 12197091,
        name: 'South Lot Stop #3',
        lat: 33.951428,
        lon: -118.394946,
      },
    ],
    patterns: [
      {
        id: 31111,
        shape:
          'epfnEl}qqUE]@EBE^Ab@@X?J?@?F?RBPPDf@E|@KfAUnAWdAUh@MTED??????ADORY^G^FZb@Rh@LTHFJI^W`@S^GTAPL|A@V@N?LBd@?T?DBLLFVCdAEPHFZAh@Ad@?T?H?J@HDBt@@l@Cj@?\\?N@NAP?HGFQA[?e@@_@A_@?MAKEKGWCi@Em@?e@?U?]Ds@Du@Be@@QDSVMj@Cx@AbAAdA?|@At@?h@?XFJVCl@AbAAjA?fA@v@G^[Rk@Nm@f@_@|@ElANtAR|ATbBT`BRbBPdBRfBR|AVlAh@~@~@b@nAHxAFtABjA?x@?b@@P?H?@???????????????????????H?T?V?N@JBNJFV@Z?b@?b@?T?R?VAR@T@j@?n@@j@@p@@l@pB`c@FTHNJJJJVJT@VAzAQVAPAZCN?FATAn@EPAz@MLMFMJWBg@?_@Co@IuAGu@EkAIuBeAwRcAiSi@eFEOIKQKKOW[c@k@e@s@WaAKkAEgAEaABu@Ze@h@Gf@XPp@Mt@c@Zk@Be@A[AWAY@i@@s@?{@@y@@w@@w@?o@@g@?g@@w@@_A?cA@eA@aA?}@?aA?iA?kACqAAoA?kA?cA?y@@o@Cm@Ys@g@y@e@s@e@e@]k@]u@_@u@Wo@GYKGg@B}@F{@Jm@H]BKBOJo@T}@d@cAr@aAv@}@v@aAl@kAb@kATmAFiAB{@?a@?I?????????????????????A?A???C?A?AEUYMa@?m@Bs@?y@?y@?w@?w@?o@B]FGDGDIFCB??CDQLYRYPc@b@m@b@KRBRb@bAZf@Xf@Vf@N`@TRXB\\STUPSNGJGHGZa@VSNMtAaAh@e@POHGDE?CFOAQGUGUES',
      },
    ],
    fetchedAt: '2026-11-04T18:17:22.397Z',
  },
  '6884': {
    stops: [
      {
        id: 11319089,
        name: 'South Lot Stop #1',
        lat: 33.95313,
        lon: -118.393406,
      },
      {
        id: 11319515,
        name: 'Terminal 1 - Lower Level',
        lat: 33.945529,
        lon: -118.400993,
      },
      {
        id: 11319516,
        name: 'Terminal 2 - Lower Level',
        lat: 33.945203697629495,
        lon: -118.40410163558198,
      },
      {
        id: 11319517,
        name: 'Terminal 3 - Lower Level',
        lat: 33.94502969750214,
        lon: -118.405951,
      },
      {
        id: 11319518,
        name: 'Terminal B - Lower Level',
        lat: 33.943494,
        lon: -118.408172,
      },
      {
        id: 11319519,
        name: 'East Lot Stop #1',
        lat: 33.953656,
        lon: -118.388307,
      },
      {
        id: 11319520,
        name: 'East Lot Stop #2',
        lat: 33.953659,
        lon: -118.387585,
      },
      {
        id: 11319521,
        name: 'East Lot Stop #3',
        lat: 33.954302,
        lon: -118.386625,
      },
      {
        id: 11319522,
        name: 'East Lot Stop #4',
        lat: 33.955145,
        lon: -118.387519,
      },
      {
        id: 11319523,
        name: 'East Lot Layover',
        lat: 33.955134,
        lon: -118.388467,
      },
      {
        id: 11443961,
        name: 'South Lot Drop Off',
        lat: 33.954436,
        lon: -118.393478,
      },
      {
        id: 12197090,
        name: 'South Lot Stop #2',
        lat: 33.952422,
        lon: -118.394823,
      },
      {
        id: 12197091,
        name: 'South Lot Stop #3',
        lat: 33.951428,
        lon: -118.394946,
      },
    ],
    patterns: [
      {
        id: 31114,
        shape:
          'qzfnE|vqqU@tADXJXTVT@vG?rB@J@FBDLAjAMxBWtA[~@Ud@Y`@MPQZ?NDRFHXNZHVHFD@F?LCNIPILIRKXAFFzBLpB@BBDDBDBF?F?zAAB@?@ArC?HBHJDtD?TGLGC{@Bq@@i@AeACq@Cc@@wA?}@AmABKROf@GzAE~CC\\Bh@EbA@J@BR@VAtA@Z@N?h@?rAAz@?DADCBC@GBE@{@Ve@^GJKNOXCPEXAT?^@TBTfD~VLf@NXTVVVTLj@J~@F|@Ft@Dx@?|@?t@?jAAj@@Z?HBBBBFBJBR?ZB`DbAjRf@jJZhHH~@Fb@HZZZ\\BbEWnBO`@KJIFKHSBY?[Ca@}Dcx@Sq@SYQUQSY]o@}@KYKc@Gk@Gu@Cs@EsAD_@DMJMTOLCR?NDJFHHJRDTDXETIRONMFQBs@DgBBal@Ag@Mc@[eAo@gEkCa@S[Ge@IQAKCGACEAGAG?Q@u@Bw@Di@Lq@RaAp@qBZc@^e@^g@bAsAj@{@Ta@Ro@Tu@Nw@Fe@Ds@?e@?c@?]CKCIIIOEU?u@@c@?U?IAGEGICIGUAIAKAeB?qCAmBAw@?E?ECACCCCG?G?[AQAq@?I?I@I@G@G?E?[@k@?U?I?EDEL?V?~@?~@@xD',
      },
    ],
    fetchedAt: '2026-11-04T18:14:22.262Z',
  },
  '6885': {
    stops: [
      {
        id: 11319089,
        name: 'South Lot Stop #1',
        lat: 33.95313,
        lon: -118.393406,
      },
      {
        id: 11319091,
        name: 'Terminal 4 - Lower Level',
        lat: 33.942585,
        lon: -118.40617,
      },
      {
        id: 11319093,
        name: 'Terminal 6 - Lower Level',
        lat: 33.942976,
        lon: -118.40242,
      },
      {
        id: 11319094,
        name: 'Terminal 7 - Lower Level',
        lat: 33.94332,
        lon: -118.399168,
      },
      {
        id: 11319515,
        name: 'Terminal 1 - Lower Level',
        lat: 33.945529,
        lon: -118.400993,
      },
      {
        id: 11319516,
        name: 'Terminal 2 - Lower Level',
        lat: 33.945203697629495,
        lon: -118.40410163558198,
      },
      {
        id: 11319517,
        name: 'Terminal 3 - Lower Level',
        lat: 33.94502969750214,
        lon: -118.405951,
      },
      {
        id: 11319518,
        name: 'Terminal B - Lower Level',
        lat: 33.943494,
        lon: -118.408172,
      },
      {
        id: 12197090,
        name: 'South Lot Stop #2',
        lat: 33.952422,
        lon: -118.394823,
      },
      {
        id: 12197091,
        name: 'South Lot Stop #3',
        lat: 33.951428,
        lon: -118.394946,
      },
      {
        id: 12198214,
        name: 'South Premium Stop #1',
        lat: 33.95199,
        lon: -118.391007,
      },
      {
        id: 12198215,
        name: 'South Premium Stop #2',
        lat: 33.951982,
        lon: -118.38991,
      },
    ],
    patterns: [
      {
        id: 31115,
        shape:
          'anfnExurqUBf@FrA@BBBR?\\@^AZ?F?DD@H@b@Af@C\\@N?J@N@FDBH@b@?h@Cb@AT?H?D?D?D?L@@C??????????????????BBHAP?JEDI@a@Ac@?c@A[?MAOIQC[Ce@Em@?k@@c@HYH[@g@Ag@?S@OHU^Kn@Av@?t@?t@Ap@An@?h@?b@?RHF\\Cl@Az@?z@?v@?p@?j@EZYJc@Hi@Z_@h@Qr@Cz@H|@N~@Jx@Jt@Jv@Jv@Jt@Hp@Hr@Ht@H|@HbAH`AL|@Pr@Zh@d@`@l@Rp@Dr@Bl@Dj@Bf@@b@?b@?^?^?^?^?Z?P?J?H?@???@?P?PBLHHN@RAZCZAV?X?ZCp@\\nHb@|H`@pJd@dKb@jAj@Lj@En@Kb@E\\C^GfBIj@Sd@_@Pe@?{@UoFoAmVc@oJ_@yGM}BKy@Oe@WYMUU[[a@_@e@[m@Qs@Kw@Es@Em@Gs@G}@IeAKgAMgAc@_Aa@gAYaAOoACaAC_AAaA@_AAy@Gu@Ei@Ae@?o@?_AAkAAsAAuA?oA?gA?cA@}@Au@Em@Ae@?_@?U?K?o@A[SUc@Eo@By@Aq@?i@@_@?O?KAS?WDO\\?t@B|@?|@?~@?~@?|@?z@Az@A|@?x@?r@A^?L?N?N?F?Z?p@CbAA`A?t@Ad@?R?J?@????@DEP[Dk@A{@AaA?eA?eA@cA@eABaA?_A@aA@{@Fw@Fq@Jg@FW?KKCUBe@@e@@c@@]?S@{@?i@?i@?i@?a@?S?u@?Y?WEUMKSAWLWDW@IBGFCPEfBIbAQdAU~@]z@_@n@[b@MNGFENRXb@Td@LTFHH?RUb@U^K\\CXBb@B`@BR',
      },
    ],
    fetchedAt: '2026-11-04T20:30:17.995Z',
  },
};
