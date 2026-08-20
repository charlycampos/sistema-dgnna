import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  numeroExpediente: z.string().min(1, "obligatorio"),
}).refine(d => true, { message: "x" });

const resolver = zodResolver(schema);

const result = await resolver({ numeroExpediente: "" }, undefined, { shouldUseNativeValidation: false, fields: {} });
console.log(JSON.stringify(result, null, 2));
