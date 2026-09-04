import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const {close, data} = shopify;

  const [loading, setLoading] = useState(true);
  const [orderName, setOrderName] = useState('');
  const [productionList, setProductionList] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrder();
  }, []);

  async function loadOrder() {
    try {
      const orderId = data.selected?.[0]?.id;

      if (!orderId) {
        setError('No se pudo identificar el pedido.');
        setLoading(false);
        return;
      }

      const query = {
        query: `
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
        variables: {
          id: orderId,
        },
      };

      const response = await fetch('shopify:admin/api/graphql.json', {
        method: 'POST',
        body: JSON.stringify(query),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error('Error al consultar el pedido.');
      }

      const order = result.data?.order;

      setOrderName(order?.name || 'pedido');

     let readableAttribute;

for (const item of order?.customAttributes || []) {
  if (item.key === 'Listado de producción') {
    readableAttribute = item;
    break;
  }
}

      if (!readableAttribute?.value) {
        setError('Este pedido no contiene un listado de producción.');
      } else {
        setProductionList(readableAttribute.value);
      }
    } catch (err) {
      console.error(err);
      setError('No fue posible cargar el listado de producción.');
    } finally {
      setLoading(false);
    }
  }

 function downloadCsv() {
  const orderId = data.selected?.[0]?.id;

  if (!orderId) {
    setError('No se pudo identificar el pedido.');
    return;
  }

 const url = `app:api/production-list/csv?orderId=${encodeURIComponent(orderId)}`;

  open(url);
}
  return (
    <s-admin-action heading="Descargar listado de producción">
      {loading ? (
        <s-text>Cargando listado...</s-text>
      ) : error ? (
        <s-banner tone="critical">{error}</s-banner>
      ) : (
        <s-stack direction="block" gap="base">
          <s-text>
            Pedido {orderName}
          </s-text>

          <s-text>
            El listado de producción está listo para descargar.
          </s-text>

          <s-button variant="primary" onClick={downloadCsv}>
            Descargar CSV
          </s-button>
        </s-stack>
      )}

      <s-button slot="secondary-actions" onClick={close}>
        Cerrar
      </s-button>
    </s-admin-action>
  );
}