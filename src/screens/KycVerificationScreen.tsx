import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/colors';
import { AppHeader } from '../components/AppHeader';
import { getKycStatus, uploadKycDocument, submitKycDocuments, getPartnerProfile } from '../api/api';

export default function KycVerificationScreen({ navigation }: any) {
  const { partner, updatePartner } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const [kycStatus, setKycStatus] = useState<string>('pending');
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  // Form Fields
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarUrl, setAadhaarUrl] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [panUrl, setPanUrl] = useState('');
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState('');
  const [drivingLicenseUrl, setDrivingLicenseUrl] = useState('');

  const fetchKycInfo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getKycStatus();
      if (res.data?.success) {
        setKycStatus(res.data.kycStatus || 'pending');
        setIsApproved(!!res.data.isApproved);
        setRejectReason(res.data.kycRejectReason || null);

        const docs = res.data.kycDocuments || {};
        if (docs.aadhaar) {
          setAadhaarNumber(docs.aadhaar.number || '');
          setAadhaarUrl(docs.aadhaar.url || '');
        }
        if (docs.pan) {
          setPanNumber(docs.pan.number || '');
          setPanUrl(docs.pan.url || '');
        }
        if (docs.drivingLicense) {
          setDrivingLicenseNumber(docs.drivingLicense.number || '');
          setDrivingLicenseUrl(docs.drivingLicense.url || '');
        }
      }
    } catch (err: any) {
      console.log('Error fetching KYC status:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKycInfo();
  }, [fetchKycInfo]);

  const pickImage = async (docType: 'aadhaar' | 'pan' | 'drivingLicense') => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Gallery access is required to select document photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadFile(docType, asset);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not pick image');
    }
  };

  const uploadFile = async (docType: string, asset: ImagePicker.ImagePickerAsset) => {
    setUploadingDoc(docType);
    try {
      const formData = new FormData();
      const uri = asset.uri;
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1] || 'jpg';

      formData.append('document', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: `${docType}_${Date.now()}.${fileType}`,
        type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
      } as any);
      formData.append('type', docType);

      const res = await uploadKycDocument(formData);
      if (res.data?.success && res.data.url) {
        if (docType === 'aadhaar') setAadhaarUrl(res.data.url);
        else if (docType === 'pan') setPanUrl(res.data.url);
        else if (docType === 'drivingLicense') setDrivingLicenseUrl(res.data.url);
        Alert.alert('Success', `${docType.toUpperCase()} document uploaded successfully!`);
      } else {
        // Fallback to local URI
        if (docType === 'aadhaar') setAadhaarUrl(uri);
        else if (docType === 'pan') setPanUrl(uri);
        else if (docType === 'drivingLicense') setDrivingLicenseUrl(uri);
      }
    } catch (e: any) {
      console.log('Upload fallback using uri:', e?.message);
      // Fallback
      if (docType === 'aadhaar') setAadhaarUrl(asset.uri);
      else if (docType === 'pan') setPanUrl(asset.uri);
      else if (docType === 'drivingLicense') setDrivingLicenseUrl(asset.uri);
      Alert.alert('Notice', 'Image selected. Please click Submit below to save your KYC.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSubmit = async () => {
    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');
    const cleanPan = panNumber.trim().toUpperCase();

    if (!cleanAadhaar || cleanAadhaar.length < 12) {
      Alert.alert('Validation Error', 'Kripya 12-digit valid Aadhaar number daalein.');
      return;
    }
    if (!aadhaarUrl) {
      Alert.alert('Validation Error', 'Kripya Aadhaar card ki photo upload karein.');
      return;
    }
    if (!cleanPan || cleanPan.length !== 10) {
      Alert.alert('Validation Error', 'Kripya valid 10-character PAN number daalein (jaise ABCDE1234F).');
      return;
    }
    if (!panUrl) {
      Alert.alert('Validation Error', 'Kripya PAN card ki photo upload karein.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitKycDocuments({
        aadhaarNumber: cleanAadhaar,
        aadhaarUrl,
        panNumber: cleanPan,
        panUrl,
        drivingLicenseNumber: drivingLicenseNumber.trim(),
        drivingLicenseUrl: drivingLicenseUrl || undefined,
      });

      if (res.data?.success) {
        setKycStatus('submitted');
        setIsApproved(false);
        setRejectReason(null);
        await updatePartner({ kycStatus: 'submitted', isApproved: false });

        Alert.alert(
          'Documents Submitted! 🎉',
          'Aapke KYC documents admin verification ke liye submit ho gaye hain. Admin approval ke baad aapka account active ho jayega aur aap online delivery orders accept kar sakenge.',
          [
            {
              text: 'OK',
              onPress: () => {
                fetchKycInfo();
              },
            },
          ]
        );
      } else {
        Alert.alert('Submission Failed', res.data?.message || 'Could not submit documents.');
      }
    } catch (err: any) {
      Alert.alert(
        'Submission Error',
        err.response?.data?.message || 'Submission failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBanner = () => {
    if (kycStatus === 'verified' && isApproved) {
      return (
        <View style={[styles.statusCard, styles.statusCardVerified]}>
          <View style={styles.statusHeader}>
            <Ionicons name="checkmark-circle" size={26} color="#16A34A" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.statusTitleVerified}>KYC Verified & Active</Text>
              <Text style={styles.statusDesc}>
                Aapka rider account verify ho chuka hai. Aap online ja sakte hain aur orders receive kar sakte hain.
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (kycStatus === 'submitted') {
      return (
        <View style={[styles.statusCard, styles.statusCardSubmitted]}>
          <View style={styles.statusHeader}>
            <Ionicons name="time" size={26} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.statusTitleSubmitted}>Under Admin Review</Text>
              <Text style={styles.statusDesc}>
                Aapke documents admin verification me hain. Jald hi account approve ho jayega.
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (kycStatus === 'rejected') {
      return (
        <View style={[styles.statusCard, styles.statusCardRejected]}>
          <View style={styles.statusHeader}>
            <Ionicons name="alert-circle" size={26} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.statusTitleRejected}>Verification Rejected</Text>
              <Text style={styles.statusDesc}>
                {rejectReason || 'Documents clear nahi the ya match nahi hue. Kripya sahi documents dobara upload karein.'}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.statusCard, styles.statusCardPending]}>
        <View style={styles.statusHeader}>
          <Ionicons name="shield-outline" size={26} color="#2563EB" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.statusTitlePending}>KYC Verification Pending</Text>
            <Text style={styles.statusDesc}>
              Orders pane aur online jaane ke liye PAN aur Aadhaar card upload karna zaroori hai.
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const isLocked = kycStatus === 'verified' && isApproved;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      <AppHeader title="Documents & Verification" showBack />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading KYC details...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {renderStatusBanner()}

          {/* Aadhaar Card Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="card-outline" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>Aadhaar Card</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            </View>
            <Text style={styles.sectionHint}>
              12-digit Aadhaar number aur clear photo upload karein
            </Text>

            <Text style={styles.inputLabel}>Aadhaar Card Number *</Text>
            <TextInput
              style={[styles.input, isLocked && styles.disabledInput]}
              placeholder="e.g. 5432 1098 7654"
              value={aadhaarNumber}
              onChangeText={setAadhaarNumber}
              keyboardType="numeric"
              maxLength={14}
              editable={!isLocked}
            />

            <View style={styles.uploadArea}>
              {aadhaarUrl ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: aadhaarUrl }} style={styles.previewImage} resizeMode="cover" />
                  {!isLocked && (
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={() => pickImage('aadhaar')}
                      disabled={uploadingDoc === 'aadhaar'}
                    >
                      {uploadingDoc === 'aadhaar' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="camera" size={14} color="#fff" />
                          <Text style={styles.changeBtnText}>Change Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBox, isLocked && { opacity: 0.6 }]}
                  onPress={() => pickImage('aadhaar')}
                  disabled={isLocked || uploadingDoc === 'aadhaar'}
                >
                  {uploadingDoc === 'aadhaar' ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={32} color={theme.primary} />
                      <Text style={styles.uploadBoxTitle}>Upload Aadhaar Card Photo</Text>
                      <Text style={styles.uploadBoxSubtitle}>Front or clear full photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* PAN Card Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="finger-print-outline" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>PAN Card</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            </View>
            <Text style={styles.sectionHint}>
              10-character PAN number aur photo upload karein
            </Text>

            <Text style={styles.inputLabel}>PAN Card Number *</Text>
            <TextInput
              style={[styles.input, isLocked && styles.disabledInput]}
              placeholder="e.g. ABCDE1234F"
              value={panNumber}
              onChangeText={(t) => setPanNumber(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
              editable={!isLocked}
            />

            <View style={styles.uploadArea}>
              {panUrl ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: panUrl }} style={styles.previewImage} resizeMode="cover" />
                  {!isLocked && (
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={() => pickImage('pan')}
                      disabled={uploadingDoc === 'pan'}
                    >
                      {uploadingDoc === 'pan' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="camera" size={14} color="#fff" />
                          <Text style={styles.changeBtnText}>Change Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBox, isLocked && { opacity: 0.6 }]}
                  onPress={() => pickImage('pan')}
                  disabled={isLocked || uploadingDoc === 'pan'}
                >
                  {uploadingDoc === 'pan' ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={32} color={theme.primary} />
                      <Text style={styles.uploadBoxTitle}>Upload PAN Card Photo</Text>
                      <Text style={styles.uploadBoxSubtitle}>Front clear photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Driving License Section (Optional) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="car-outline" size={20} color="#6B7280" />
              <Text style={styles.sectionTitle}>Driving License</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>Optional</Text>
              </View>
            </View>
            <Text style={styles.sectionHint}>
              Driving license number aur photo (agar available ho)
            </Text>

            <Text style={styles.inputLabel}>License Number</Text>
            <TextInput
              style={[styles.input, isLocked && styles.disabledInput]}
              placeholder="e.g. DL-1420110012345"
              value={drivingLicenseNumber}
              onChangeText={(t) => setDrivingLicenseNumber(t.toUpperCase())}
              autoCapitalize="characters"
              editable={!isLocked}
            />

            <View style={styles.uploadArea}>
              {drivingLicenseUrl ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: drivingLicenseUrl }} style={styles.previewImage} resizeMode="cover" />
                  {!isLocked && (
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={() => pickImage('drivingLicense')}
                      disabled={uploadingDoc === 'drivingLicense'}
                    >
                      {uploadingDoc === 'drivingLicense' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="camera" size={14} color="#fff" />
                          <Text style={styles.changeBtnText}>Change Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBox, isLocked && { opacity: 0.6 }]}
                  onPress={() => pickImage('drivingLicense')}
                  disabled={isLocked || uploadingDoc === 'drivingLicense'}
                >
                  {uploadingDoc === 'drivingLicense' ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={32} color="#9CA3AF" />
                      <Text style={[styles.uploadBoxTitle, { color: '#4B5563' }]}>Upload License Photo</Text>
                      <Text style={styles.uploadBoxSubtitle}>Optional document</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Action Button */}
          {!isLocked && (
            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {kycStatus === 'rejected' ? 'Re-Submit Documents' : 'Submit for Verification'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isLocked && (
            <View style={styles.allSetCard}>
              <Ionicons name="checkmark-done-circle" size={36} color="#16A34A" />
              <Text style={styles.allSetTitle}>All Verified!</Text>
              <Text style={styles.allSetDesc}>
                Aapke documents verified hain. Aap Dashboard par jaakar Online toggle kar sakte hain aur orders receive kar sakte hain.
              </Text>
              <TouchableOpacity
                style={styles.goDashboardBtn}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.goDashboardText}>Go to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    height: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusCardVerified: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusCardSubmitted: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusCardRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusCardPending: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTitleVerified: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
  },
  statusTitleSubmitted: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B45309',
  },
  statusTitleRejected: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B91C1C',
  },
  statusTitlePending: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  statusDesc: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  requiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  optionalBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionalText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  sectionHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  uploadArea: {
    marginTop: 4,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  uploadBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
    marginTop: 8,
  },
  uploadBoxSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  changeBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    elevation: 3,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  allSetCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 10,
  },
  allSetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 8,
  },
  allSetDesc: {
    fontSize: 13,
    color: '#166534',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  goDashboardBtn: {
    marginTop: 14,
    backgroundColor: '#16A34A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  goDashboardText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
