import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, cors } = await authenticate.admin(request);

  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");

  if (!orderId) {
    return cors(
      new Response("Falta el orderId", {
        status: 400,
      }),
    );
  }

  console.log("ORDER ID:", orderId);
  const response = await admin.graphql(
    
    `#graphql
      query OrderProductionList($id: ID!) {
        order(id: $id) {
          name
          customAttributes {
            key
            value
          }
        
          lineItems(first: 100) {
  nodes {
    name
    quantity
    variantTitle
    customAttributes {
      key
      value
    }
  }
}
      }
    `,
    {
      variables: {
        id: orderId,
      },
    },
  );

  const result = await response.json();
  console.log("PRODUCTION LIST RESULT:", JSON.stringify(result, null, 2));
console.log("GRAPHQL ERRORS:", JSON.stringify(result?.errors?.graphQLErrors, null, 2));
  const order = result.data?.order;

  const getAttribute = (attributes = [], names = []) => {
  const match = attributes.find((attr) =>
    names.some(
      (name) =>
        attr.key?.trim().toLowerCase() === name.trim().toLowerCase(),
    ),
  );

  return match?.value?.trim() || "";
};

const rows = [];

for (const item of order?.lineItems?.nodes || []) {
  const attributes = item.customAttributes || [];

  const nombre = getAttribute(attributes, [
    "NOMBRE PARA EL UNIFORME",
    "Nombre",
  ]);

  const numero = getAttribute(attributes, [
    "Número del jugador",
    "Numero del jugador",
    "Número",
    "Numero",
  ]);

  const corte = getAttribute(attributes, ["Corte"]);
  const talla = getAttribute(attributes, ["Talla"]);
  const manga = getAttribute(attributes, ["Manga"]);

  const cantidad = item.quantity || 1;

  for (let i = 0; i < cantidad; i++) {
    rows.push([
      item.name || "",
      nombre,
      numero,
      corte,
      talla || item.variantTitle || "",
      manga,
    ]);
  }
}

  const csvRows = [
    ["Prenda", "Nombre", "Número", "Corte", "Talla", "Manga"],
    ...rows,
  ];

  const csv = csvRows
    .map((row) =>
      row
        .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\r\n");

  const fileName = `Listado-produccion-${(order?.name || "pedido").replace(
    "#",
    "",
  )}.csv`;

  return cors(
    new Response("\uFEFF" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    }),
  );
};