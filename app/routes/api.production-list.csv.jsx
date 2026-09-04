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

  const response = await admin.graphql(
    `#graphql
      query OrderProductionList($id: ID!) {
        order(id: $id) {
          name
          customAttributes {
            key
            value
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
  const order = result.data?.order;

  const readableAttribute = order?.customAttributes?.find(
    (item) => item.key === "Listado de producción",
  );

  if (!readableAttribute?.value) {
    return cors(
      new Response("Este pedido no contiene un listado de producción.", {
        status: 404,
      }),
    );
  }

  const rows = readableAttribute.value
    .split("\n")
    .map((line) => line.split("|").map((value) => value.trim()));

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