// P38 — Product hooks: useProducts (list with filters) and useProduct (single)
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useProducts({ page = 1, limit = 12, category = '', search = '', sort = '', minPrice = '', maxPrice = '' } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, status: 'active' };
      if (category) params.category = category;
      if (search) params.search = search;
      if (sort) params.sort = sort;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const res = await api.get('/products', { params });
      const data = res.data;
      const prods = data.products || data.data || data || [];
      setProducts(Array.isArray(prods) ? prods : []);
      setTotalPages(data.totalPages || data.pages || Math.ceil((data.total || prods.length) / limit));
      setTotal(data.total || data.totalCount || prods.length);
    } catch {
      setProducts([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, category, search, sort, minPrice, maxPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, totalPages, total, refetch: fetchProducts };
}

export function useProduct(id) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .get(`/products/${id}`)
      .then((res) => {
        const prod = res.data.product || res.data.data || res.data;
        setProduct(prod);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Product not found');
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { product, loading, error };
}
