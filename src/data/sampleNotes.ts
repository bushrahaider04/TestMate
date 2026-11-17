export interface SampleNotePreset {
  id: string;
  subject: string;
  title: string;
  content: string;
}

export const SAMPLE_NOTES: SampleNotePreset[] = [
  {
    id: "cellular-respiration",
    subject: "Biology",
    title: "Cellular Respiration",
    content: `Cellular respiration is the metabolic pathway cells use to convert chemical energy from glucose into ATP (adenosine triphosphate). It occurs in three main stages: glycolysis, the Krebs cycle (citric acid cycle), and oxidative phosphorylation.

1. Glycolysis takes place in the cytoplasm and does not require oxygen (anaerobic). One 6-carbon glucose molecule is split into two 3-carbon pyruvate molecules, producing a net gain of 2 ATP and 2 NADH.

2. Before entering the Krebs cycle, pyruvate is transported into the mitochondrial matrix and oxidized into acetyl-CoA, releasing CO2 and generating NADH. Inside the mitochondrial matrix, the Krebs cycle completes the oxidation of glucose derivatives, yielding 2 ATP, 6 NADH, 2 FADH2, and CO2 as waste.

3. Oxidative phosphorylation happens across the inner mitochondrial membrane. NADH and FADH2 donate high-energy electrons to the electron transport chain (ETC). As electrons move down the chain, protons (H+) are pumped into the intermembrane space, creating an electrochemical gradient. Oxygen acts as the final electron acceptor at the end of the ETC, combining with electrons and protons to form water (H2O). Without oxygen, the ETC backs up, halting NADH oxidation and stopping the Krebs cycle. Finally, protons flow back through ATP synthase (chemiosmosis), driving the synthesis of roughly 28 to 32 ATP molecules per glucose.`,
  },
  {
    id: "printing-press",
    subject: "History",
    title: "Gutenberg & Print",
    content: `Around 1440 in Mainz, Germany, Johannes Gutenberg developed a mechanical movable-type printing system that transformed European communication. Unlike earlier woodblock printing—which required carving an entire page onto a single wooden block—movable type used durable metal alloy letters cast from molds, allowing printers to rearrange and reuse individual characters rapidly.

Gutenberg combined three innovations: an oil-based ink that adhered cleanly to metal type (unlike water-based inks), a mechanical screw press adapted from agricultural wine and olive presses to apply even pressure, and a hand mold for mass-producing uniform lead-tin-antimony type pieces.

The cultural impact was profound. Book prices dropped dramatically within decades, shifting reading from monasteries and royal courts to merchants, artisans, and university students. Standardized texts meant scholars across Europe could reference identical editions and spot errors in ancient manuscripts. During the Protestant Reformation, Martin Luther's 95 Theses and vernacular pamphlets spread across Germany within weeks—something impossible in the era of hand-copied manuscripts. Printing also accelerated the Scientific Revolution by letting astronomers and physicians publish diagrams, tables, and experimental findings rapidly for peer critique.`,
  },
  {
    id: "price-elasticity",
    subject: "Economics",
    title: "Price Elasticity",
    content: `Price elasticity of demand (PED) measures how strongly the quantity demanded of a good responds to a change in its price. It is calculated as the percentage change in quantity demanded divided by the percentage change in price.

When the absolute value of PED is greater than 1, demand is elastic: consumers are highly price-sensitive, so a small price hike causes a larger percentage drop in units sold. Goods with many close substitutes (like a specific brand of soda) or luxury items typically exhibit elastic demand. Conversely, when PED is less than 1, demand is inelastic: quantity demanded changes relatively little when price changes. Life-saving medications such as insulin, basic utilities, and addictive goods tend to have inelastic demand because consumers have few viable substitutes.

Time horizon also shapes elasticity. Demand is usually more inelastic in the short run because buyers cannot immediately change habits or infrastructure—for instance, commuters must still buy gasoline right after a price spike. Over the long run, demand becomes more elastic as people buy fuel-efficient cars, carpool, or move closer to transit. Total revenue (Price x Quantity) moves in opposite directions depending on elasticity: raising prices increases total revenue when demand is inelastic, but decreases total revenue when demand is elastic.`,
  },
];
