-- ImplantDesk Seed Data — 25 realistic implant components
-- Run this AFTER schema.sql in your Supabase SQL Editor

insert into public.implant_components
  (name, system, abutment_type, gingival_height_mm, platform_diameter, material, component_code, manufacturer_code, price, stock_qty, description)
values

-- STRAUMANN (5)
(
  'Straumann Bone Level Straight Abutment GH1 RP',
  'Straumann', 'Straight', 1, 4.1, 'Titanium',
  'STR-BL-SA-GH1-41', '048.800',
  2800, 24,
  'Titanium straight abutment for Bone Level implants. Regular Platform 4.1mm. Ideal for prosthetics requiring minimal emergence profile.'
),
(
  'Straumann Bone Level Straight Abutment GH2 RP',
  'Straumann', 'Straight', 2, 4.1, 'Titanium',
  'STR-BL-SA-GH2-41', '048.801',
  2950, 18,
  'Regular platform straight abutment with 2mm gingival height. Compatible with all Bone Level RP implants.'
),
(
  'Straumann CARES Angled 17° Abutment GH2 NP',
  'Straumann', 'Angled 17°', 2, 3.5, 'Titanium',
  'STR-CARES-17-GH2-35', '048.602',
  4200, 10,
  'Angulated abutment for correcting implant angulation up to 17°. Narrow Platform 3.5mm.'
),
(
  'Straumann Multi-Unit Abutment 0° GH3 RP',
  'Straumann', 'Multi-unit', 3, 4.1, 'Titanium',
  'STR-MU-0-GH3-41', '026.3631',
  5600, 8,
  'Multi-unit abutment for full-arch prosthetic restorations. 0° angulation, 3mm gingival height.'
),
(
  'Straumann Scan Body RP for CARES',
  'Straumann', 'Scan Body', 0, 4.1, 'PEEK',
  'STR-SCAN-RP-CARES', '048.910',
  1800, 30,
  'PEEK scan body for digital impression with CARES intraoral scanner. Regular Platform.'
),

-- NOBEL BIOCARE (5)
(
  'Nobel Biocare Multi-unit Angled 30° GH2',
  'Nobel Biocare', 'Angled 30°', 2, 4.3, 'Titanium',
  'NB-MU-30-GH2-43', '34344',
  6200, 6,
  '30° angled multi-unit abutment for All-on-4/All-on-6 protocols. Regular connection.'
),
(
  'Nobel Biocare Straight Abutment GH1 NP',
  'Nobel Biocare', 'Straight', 1, 3.0, 'Titanium',
  'NB-SA-GH1-30', '28948',
  3100, 20,
  'Narrow platform straight abutment for smaller diameter implants. 1mm gingival height.'
),
(
  'Nobel Biocare Conical Connection Abutment GH2 RP',
  'Nobel Biocare', 'Straight', 2, 4.3, 'Zirconia',
  'NB-CC-ZR-GH2-43', '29054',
  7500, 7,
  'Zirconia conical connection abutment for superior aesthetics. 2mm gingival height.'
),
(
  'Nobel Biocare Temporary Abutment RP',
  'Nobel Biocare', 'Temporary', 0, 4.3, 'PEEK',
  'NB-TEMP-RP-43', '30025',
  1400, 40,
  'PEEK temporary abutment for immediate loading protocols. Compatible with all RP conical connection implants.'
),
(
  'Nobel Biocare Scan Body NP for NobelProcera',
  'Nobel Biocare', 'Scan Body', 0, 3.0, 'PEEK',
  'NB-SCAN-NP-30', '31702',
  1600, 25,
  'Narrow platform scan body for digital workflows. Compatible with NobelProcera design software.'
),

-- OSSTEM (5)
(
  'Osstem GH2 Straight Abutment US II RP',
  'Osstem', 'Straight', 2, 4.0, 'Titanium',
  'OSS-USII-SA-GH2-40', 'AUUSAB24',
  1900, 35,
  'Cost-effective straight abutment for US II system. 2mm gingival height, regular platform.'
),
(
  'Osstem Angled 17° Abutment GH3 RP',
  'Osstem', 'Angled 17°', 3, 4.0, 'Titanium',
  'OSS-17A-GH3-40', 'AUUSAA3HO4',
  2400, 15,
  '17° angled correction abutment. Suitable for US II, SS II systems. 3mm gingival height.'
),
(
  'Osstem GH4 Straight Abutment WP',
  'Osstem', 'Straight', 4, 5.0, 'Titanium',
  'OSS-SA-GH4-50', 'AUUSAB45',
  2100, 20,
  'Wide platform straight abutment for 5mm diameter implants. 4mm gingival height.'
),
(
  'Osstem Multi-unit 30° Abutment GH2 RP',
  'Osstem', 'Angled 30°', 2, 4.0, 'Titanium',
  'OSS-MU-30-GH2-40', 'MUAB302',
  4800, 10,
  '30° angled multi-unit abutment compatible with Osstem US, SS, and TS systems.'
),
(
  'Osstem Scan Body RP Standard',
  'Osstem', 'Scan Body', 0, 4.0, 'PEEK',
  'OSS-SCAN-RP-STD', 'SCANBOSS4',
  1200, 50,
  'Universal scan body for Osstem regular platform. Compatible with all major CAD/CAM software.'
),

-- MIS (5)
(
  'MIS V3 Straight Abutment GH2 RP',
  'MIS', 'Straight', 2, 4.2, 'Titanium',
  'MIS-V3-SA-GH2-42', 'V3AM24',
  2200, 22,
  'Straight abutment for MIS V3 implant system. Regular platform 4.2mm, 2mm gingival height.'
),
(
  'MIS C1 Angled 17° Abutment GH1',
  'MIS', 'Angled 17°', 1, 3.75, 'Titanium',
  'MIS-C1-17A-GH1-375', 'C1AM171',
  2600, 12,
  'MIS C1 connection 17° angled abutment. Narrow regular platform for corrected angulation cases.'
),
(
  'MIS Seven Straight Abutment GH3 WP',
  'MIS', 'Straight', 3, 5.0, 'Titanium',
  'MIS-7-SA-GH3-50', 'SVAM35',
  2400, 18,
  'Wide platform straight abutment for MIS Seven system. 5mm diameter, 3mm gingival height.'
),
(
  'MIS Multi-unit 0° Abutment GH3 RP',
  'MIS', 'Multi-unit', 3, 4.2, 'Titanium',
  'MIS-MU-0-GH3-42', 'MUAM03',
  5100, 9,
  'Multi-unit straight abutment for hybrid prosthetics on MIS V3/Seven systems.'
),
(
  'MIS Temporary PEEK Abutment RP',
  'MIS', 'Temporary', 0, 4.2, 'PEEK',
  'MIS-TEMP-PEEK-RP', 'TPAM400',
  1300, 45,
  'PEEK temporary abutment for provisional restorations during healing phase.'
),

-- BIOHORIZONS (5)
(
  'BioHorizons Tapered Internal Straight GH2 RP',
  'BioHorizons', 'Straight', 2, 4.5, 'Titanium',
  'BH-TI-SA-GH2-45', '5.5SA2',
  3200, 16,
  'Internal connection straight abutment for Tapered Internal implants. 4.5mm platform, 2mm gingival height.'
),
(
  'BioHorizons Laser-Lok Angled 17° GH2 RP',
  'BioHorizons', 'Angled 17°', 2, 4.5, 'Titanium',
  'BH-LL-17A-GH2-45', '5.5A17-2',
  3900, 11,
  'Angled abutment featuring patented Laser-Lok microgrooves for soft tissue attachment. 17° angulation.'
),
(
  'BioHorizons Multi-unit Angled 30° GH1',
  'BioHorizons', 'Angled 30°', 1, 4.5, 'Titanium',
  'BH-MU-30-GH1-45', 'MUA30-1',
  5800, 7,
  'Full-arch 30° angled multi-unit abutment for tilted distal implant placement.'
),
(
  'BioHorizons Zirconia Straight Abutment GH3',
  'BioHorizons', 'Straight', 3, 4.5, 'Zirconia',
  'BH-ZR-SA-GH3-45', 'ZRAM3-45',
  8400, 5,
  'Premium zirconia abutment for anterior restorations requiring optimal tissue aesthetics.'
),
(
  'BioHorizons Scan Body Tapered Internal',
  'BioHorizons', 'Scan Body', 0, 4.5, 'PEEK',
  'BH-SCAN-TI-45', 'SCANBH4',
  1700, 28,
  'Digital impression scan body for BioHorizons Tapered Internal system. Compatible with 3Shape, CEREC, and iTero.'
);
