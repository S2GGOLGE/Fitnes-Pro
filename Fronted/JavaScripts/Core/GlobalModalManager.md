# Global Modal Manager - Kullanım Kılavuzu

Fitness Pro uygulaması için merkezi, reusable modal sistemi.

## Kurulum

Global Modal Manager'ı kullanmak için aşağıdaki dosyaları sayfanıza ekleyin:

```html
<!-- CSS -->
<link rel="stylesheet" href="../Css/Core/GlobalModal.css">

<!-- JavaScript -->
<script src="../JavaScripts/Core/GlobalModalManager.js"></script>
```

## Temel Kullanım

### Modal Açma

```javascript
// Basit bilgi modalı
window.GlobalModal.open({
    title: "Bilgi",
    description: "İşlem başarıyla tamamlandı.",
    type: "info"
});
```

### Modal Kapatma

```javascript
window.GlobalModal.close();
```

## Modal Tipleri

### 1. Bilgi Modalı (Info)

```javascript
window.GlobalModal.open({
    type: "info",
    title: "Bilgi",
    description: "Bu bir bilgi mesajıdır.",
    buttons: [
        {
            text: "Tamam",
            className: "global-modal-button-primary",
            closeOnClick: true
        }
    ]
});
```

### 2. Başarı Modalı (Success)

```javascript
window.GlobalModal.open({
    type: "success",
    title: "Başarılı!",
    description: "İşlem başarıyla tamamlandı.",
    buttons: [
        {
            text: "Tamam",
            className: "global-modal-button-primary",
            closeOnClick: true
        }
    ]
});
```

### 3. Uyarı Modalı (Warning)

```javascript
window.GlobalModal.open({
    type: "warning",
    title: "Uyarı",
    description: "Bu işlem geri alınamaz.",
    buttons: [
        {
            text: "İptal",
            className: "global-modal-button-secondary",
            closeOnClick: true
        },
        {
            text: "Devam Et",
            className: "global-modal-button-primary",
            closeOnClick: true
        }
    ]
});
```

### 4. Hata Modalı (Error)

```javascript
window.GlobalModal.open({
    type: "error",
    title: "Hata",
    description: "Bir hata oluştu. Lütfen tekrar deneyin.",
    buttons: [
        {
            text: "Tamam",
            className: "global-modal-button-primary",
            closeOnClick: true
        }
    ]
});
```

### 5. Onay Modalı (Confirmation)

```javascript
window.GlobalModal.confirm({
    title: "Emin misiniz?",
    description: "Bu öğeyi silmek istediğinize emin misiniz?",
    onConfirm: () => {
        console.log("Kullanıcı onayladı");
        // Silme işlemini burada yapın
    }
});
```

### 6. Silme Onayı (Delete Confirmation)

```javascript
window.GlobalModal.open({
    type: "delete",
    title: "Öğeyi Sil",
    description: "Bu öğeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
    buttons: [
        {
            text: "İptal",
            className: "global-modal-button-secondary",
            closeOnClick: true
        },
        {
            text: "Sil",
            className: "global-modal-button-danger",
            callback: () => {
                console.log("Öğe silindi");
                // Silme işlemini burada yapın
            },
            closeOnClick: true
        }
    ]
});
```

### 7. Form Modalı

```javascript
window.GlobalModal.open({
    title: "Form Başlığı",
    description: "Lütfen bilgileri doldurun.",
    content: `
        <form id="myForm">
            <div class="form-group">
                <label>Ad</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>E-posta</label>
                <input type="email" name="email" required>
            </div>
        </form>
    `,
    buttons: [
        {
            text: "İptal",
            className: "global-modal-button-secondary",
            closeOnClick: true
        },
        {
            text: "Kaydet",
            className: "global-modal-button-primary",
            callback: () => {
                const form = document.getElementById("myForm");
                // Form işlemini burada yapın
            },
            closeOnClick: false
        }
    ]
});
```

### 8. Özel İçerik Modalı (Custom Content)

```javascript
window.GlobalModal.open({
    title: "Detaylar",
    content: `
        <div class="custom-content">
            <p>Bu özel HTML içeriğidir.</p>
            <ul>
                <li>Öğe 1</li>
                <li>Öğe 2</li>
                <li>Öğe 3</li>
            </ul>
        </div>
    `,
    buttons: [
        {
            text: "Kapat",
            className: "global-modal-button-primary",
            closeOnClick: true
        }
    ]
});
```

### 9. Loading Modalı

```javascript
window.GlobalModal.open({
    type: "loading",
    title: "İşleniyor...",
    description: "Lütfen bekleyin.",
    loading: true
});
```

## Gelişmiş Seçenekler

### Özel İkon

```javascript
window.GlobalModal.open({
    title: "Özel İkon",
    description: "Özel SVG ikon kullanımı.",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 8v8"></path>
        <path d="M8 12h8"></path>
    </svg>`,
    buttons: [
        {
            text: "Tamam",
            className: "global-modal-button-primary",
            closeOnClick: true
        }
    ]
});
```

### Overlay Kontrolü

```javascript
// Overlay tıklaması ile kapatmayı engelle
window.GlobalModal.open({
    title: "Kritik İşlem",
    description: "Bu modal overlay tıklaması ile kapatılamaz.",
    closeOnOverlay: false,
    closeOnEscape: false,
    buttons: [
        {
            text: "Tamam",
            className: "global-modal-button-primary",
            closeOnClick: true
        }
    ]
});
```

### Özel Buton Ayarları

```javascript
window.GlobalModal.open({
    title: "Özel Butonlar",
    description: "Her buton için özel ayarlar.",
    buttons: [
        {
            text: "İptal",
            className: "global-modal-button-secondary",
            disabled: false,
            closeOnClick: true,
            callback: () => {
                console.log("İptal tıklandı");
            }
        },
        {
            text: "Kaydet",
            className: "global-modal-button-primary",
            disabled: false,
            closeOnClick: false,
            callback: () => {
                console.log("Kaydet tıklandı");
                // Validasyon başarısız olursa modal açık kalır
                window.GlobalModal.close();
            }
        },
        {
            text: "Sil",
            className: "global-modal-button-danger",
            disabled: true,
            closeOnClick: true,
            callback: () => {
                console.log("Sil tıklandı");
            }
        }
    ]
});
```

### Modal Boyutu

```javascript
window.GlobalModal.open({
    title: "Büyük Modal",
    description: "Daha geniş içerik için.",
    size: "large",
    content: "<div>Bu modal daha geniştir.</div>",
    buttons: [
        {
            text: "Kapat",
            className: "global-modal-button-primary",
            closeOnClick: true
        }
    ]
});

```

`size` için `small`, `large` ve `full` değerleri kullanılabilir. Butonların
yükleme durumunu işlem sırasında değiştirmek için `button.id` tanımlayıp
`window.GlobalModal.setLoading("button-id", true)` çağırabilirsiniz.

## Convenience Methods

### Alert Method

```javascript
window.GlobalModal.alert({
    type: "success",
    title: "Başarılı",
    message: "İşlem tamamlandı."
});
```

### Confirm Method

```javascript
window.GlobalModal.confirm({
    title: "Emin misiniz?",
    description: "Bu işlemi yapmak istediğinize emin misiniz?",
    onConfirm: () => {
        console.log("Onaylandı");
    }
});
```

## Durum Kontrolü

```javascript
// Modal açık mı kontrol et
if (window.GlobalModal.isOpen()) {
    console.log("Modal şu anda açık");
} else {
    console.log("Modal kapalı");
}
```

## Callback Kullanımı

### onClose Callback

```javascript
window.GlobalModal.open({
    title: "Onay",
    description: "Modal kapatıldığında çalışacak callback.",
    onClose: () => {
        console.log("Modal kapatıldı");
        // Temizleme işlemleri
    },
    buttons: [
        {
            text: "Tamam",
            className: "global-modal-button-primary",
            closeOnClick: true
        }
    ]
});
```

## Gerçek Dünya Örnekleri

### API İşlemi Örneği

```javascript
async function deleteUser(userId) {
    window.GlobalModal.confirm({
        title: "Kullanıcı Sil",
        description: "Bu kullanıcıyı silmek istediğinize emin misiniz?",
        onConfirm: async () => {
            // Loading modalı göster
            window.GlobalModal.open({
                title: "Siliniyor...",
                description: "Lütfen bekleyin.",
                buttons: [
                    {
                        text: "İşleniyor...",
                        className: "global-modal-button-primary",
                        loading: true,
                        disabled: true
                    }
                ],
                closeOnOverlay: false,
                closeOnEscape: false
            });

            try {
                const response = await fetch(`/api/users/${userId}`, {
                    method: "DELETE"
                });

                if (response.ok) {
                    window.GlobalModal.open({
                        type: "success",
                        title: "Başarılı",
                        description: "Kullanıcı başarıyla silindi.",
                        buttons: [
                            {
                                text: "Tamam",
                                className: "global-modal-button-primary",
                                closeOnClick: true
                            }
                        ]
                    });
                } else {
                    throw new Error("Silme başarısız");
                }
            } catch (error) {
                window.GlobalModal.open({
                    type: "error",
                    title: "Hata",
                    description: "Kullanıcı silinirken bir hata oluştu.",
                    buttons: [
                        {
                            text: "Tamam",
                            className: "global-modal-button-primary",
                            closeOnClick: true
                        }
                    ]
                });
            }
        }
    });
}
```

### Form Validasyonu Örneği

```javascript
function showEditForm(item) {
    window.GlobalModal.open({
        title: "Öğeyi Düzenle",
        content: `
            <form id="editForm">
                <div class="form-group">
                    <label>Ad</label>
                    <input type="text" name="name" value="${item.name}" required>
                </div>
                <div class="form-group">
                    <label>Açıklama</label>
                    <textarea name="description" rows="3">${item.description || ''}</textarea>
                </div>
            </form>
        `,
        buttons: [
            {
                text: "İptal",
                className: "global-modal-button-secondary",
                closeOnClick: true
            },
            {
                text: "Kaydet",
                className: "global-modal-button-primary",
                callback: () => {
                    const form = document.getElementById("editForm");
                    const formData = new FormData(form);
                    
                    // Basit validasyon
                    if (!formData.get("name").trim()) {
                        window.GlobalModal.open({
                            type: "error",
                            title: "Hata",
                            description: "Ad alanı boş olamaz.",
                            buttons: [
                                {
                                    text: "Tamam",
                                    className: "global-modal-button-primary",
                                    closeOnClick: true
                                }
                            ]
                        });
                        return false; // Modalı kapatma
                    }
                    
                    // Formu gönder
                    saveItem(formData);
                    return true; // Modalı kapat
                },
                closeOnClick: false
            }
        ]
    });
}
```

## CSS Sınıfları

### Modal İçerik Boyutları

- `.global-modal-content` - Varsayılan boyut (max-width: 500px)
- `.global-modal-content.size-small` - Küçük modal (max-width: 400px)
- `.global-modal-content.size-large` - Büyük modal (max-width: 700px)
- `.global-modal-content.size-full` - Tam ekran modal (max-width: 90vw)

### Buton Sınıfları

- `.global-modal-button-primary` - Ana buton (yeşil)
- `.global-modal-button-secondary` - İkincil buton (gri)
- `.global-modal-button-danger` - Tehlikeli buton (kırmızı)

## Accessibility

Global Modal Manager aşağıdaki accessibility özelliklerini destekler:

- `role="dialog"` ve `aria-modal="true"` atribütleri
- Dinamik `aria-labelledby` ve `aria-hidden`
- Klavye navigasyonu (ESC ve Tab focus trap)
- Focus management (açılışta transfer, kapanışta tetikleyiciye dönüş)
- Reduced motion desteği
- High contrast mode desteği

## Browser Desteği

- Chrome/Edge (son 2 sürüm)
- Firefox (son 2 sürüm)
- Safari (son 2 sürüm)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Best Practices

1. **Modal Kullanımı**: Modal sadece önemli bilgiler ve kritik işlemler için kullanın
2. **Buton Sırası**: Genellikle ikincil buton önce, ana buton sonra gelir
3. **Overlay Kontrolü**: Kritik işlemlerde `closeOnOverlay: false` kullanın
4. **Loading State**: Uzun süren işlemlerde loading butonu gösterin
5. **Error Handling**: Hatalarda açıklayıcı mesajlar verin
6. **Focus Management**: Modal kapatıldığında focus'u doğru elemente geri döndürün

## Sorun Giderme

### Modal Açılmıyor

1. CSS ve JS dosyalarının doğru yüklendiğinden emin olun
2. Console'da JavaScript hataları olup olmadığını kontrol edin
3. `window.GlobalModal` nesnesinin varlığını kontrol edin

### Stiller Bozuk Görünüyor

1. GlobalModal.css dosyasının yüklendiğinden emin olun
2. CSS değişkenlerinin (`--primary`, `--card`, vb.) tanımlı olduğunu kontrol edin
3. Tarayıcı konsolunda CSS hataları olup olmadığını kontrol edin

### Focus Sorunları

1. Modal açıldığında focus'un modal içinde olduğunu kontrol edin
2. Modal kapatıldığında focus'un önceki elemente döndüğünü kontrol edin
3. `tabindex` atribütlerinin doğru kullanıldığından emin olun
